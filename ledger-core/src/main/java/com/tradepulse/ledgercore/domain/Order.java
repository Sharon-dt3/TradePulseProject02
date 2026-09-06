package com.tradepulse.ledgercore.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Maps to the "orders" table created in V11__orders.sql
 * (rejection_reason added in V12__orders_rejection_reason.sql;
 * request_id/request_hash added in V13__orders_idempotency.sql;
 * order_type LIMIT plus limit_price/expires_at added in
 * V15__limit_orders.sql).
 * App-created, like Trade — see Trade's javadoc for why that means a
 * public constructor and an app-generated id rather than the column's
 * gen_random_uuid() default.
 *
 * Status changes go through fill()/reject()/markWorking()/expire() rather
 * than a public setter, so OrderServiceImpl (the only writer) can't push
 * an order into a state its own lifecycle doesn't allow.
 *
 * requestId/requestHash are set once at construction and never changed
 * afterward — Phase 5's idempotency check is "does a row with this
 * (accountId, requestId) already exist," which only works if the values
 * are fixed for the life of the row, not mutable state.
 *
 * market()/limit() replace what used to be a single public constructor:
 * a LIMIT order carries two fields (limitPrice, expiresAt) a MARKET order
 * never has, and V15's own CHECK constraint enforces that split at the
 * database level — the two factory methods enforce it at construction
 * time too, rather than a single constructor taking nullable params that
 * could be passed inconsistently.
 */
@Entity
@Table(name = "orders")
public class Order {

    /**
     * LIMIT added in Phase 8 (V15__limit_orders.sql) — a MARKET order's
     * limitPrice/expiresAt are always null; a LIMIT order's are always
     * set. See this class's javadoc for why that split is a factory
     * method rather than a nullable constructor param.
     */
    public enum OrderType {
        MARKET, LIMIT
    }

    /**
     * All seven states are declared since Phase 3 — WORKING/EXPIRED are
     * Phase 8's (PARTIALLY_FILLED still belongs to a matching engine this
     * project doesn't have; CANCELLED to a not-yet-built cancel
     * endpoint). Matches V11__orders.sql's status CHECK.
     */
    public enum Status {
        NEW, WORKING, FILLED, PARTIALLY_FILLED, CANCELLED, REJECTED, EXPIRED
    }

    @Id
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "symbol", nullable = false)
    private String symbol;

    @Enumerated(EnumType.STRING)
    @Column(name = "side", nullable = false)
    private Trade.Side side;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false)
    private OrderType orderType;

    @Column(name = "quantity", nullable = false)
    private BigDecimal quantity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status;

    @Enumerated(EnumType.STRING)
    @Column(name = "rejection_reason")
    private RejectionReason rejectionReason;

    @Column(name = "request_id")
    private UUID requestId;

    @Column(name = "request_hash")
    private String requestHash;

    @Column(name = "limit_price")
    private BigDecimal limitPrice;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Order() {
        // required by JPA
    }

    private Order(UUID accountId, String symbol, Trade.Side side, OrderType orderType, BigDecimal quantity,
                  UUID requestId, String requestHash, BigDecimal limitPrice, OffsetDateTime expiresAt) {
        this.id = UUID.randomUUID();
        this.accountId = accountId;
        this.symbol = symbol;
        this.side = side;
        this.orderType = orderType;
        this.quantity = quantity;
        this.status = Status.NEW;
        this.requestId = requestId;
        this.requestHash = requestHash;
        this.limitPrice = limitPrice;
        this.expiresAt = expiresAt;
        this.createdAt = OffsetDateTime.now();
    }

    public static Order market(UUID accountId, String symbol, Trade.Side side, BigDecimal quantity,
                                UUID requestId, String requestHash) {
        return new Order(accountId, symbol, side, OrderType.MARKET, quantity, requestId, requestHash, null, null);
    }

    public static Order limit(UUID accountId, String symbol, Trade.Side side, BigDecimal quantity,
                               BigDecimal limitPrice, OffsetDateTime expiresAt, UUID requestId, String requestHash) {
        if (limitPrice == null) {
            throw new IllegalArgumentException("limitPrice is required for a LIMIT order");
        }
        if (expiresAt == null) {
            throw new IllegalArgumentException("expiresAt is required for a LIMIT order");
        }
        return new Order(accountId, symbol, side, OrderType.LIMIT, quantity, requestId, requestHash, limitPrice, expiresAt);
    }

    /**
     * Whether this LIMIT order's price is at least as good as the given
     * market price for its side — a BUY wants to pay no more than
     * limitPrice, so it crosses once the market is at or below it; a
     * SELL wants at least limitPrice, so it crosses at or above.
     * Only meaningful for a LIMIT order — MARKET orders don't have a
     * limitPrice to compare against.
     */
    public boolean crosses(BigDecimal marketPrice) {
        if (orderType != OrderType.LIMIT) {
            throw new IllegalStateException("crosses() only applies to LIMIT orders, was " + orderType);
        }
        return side == Trade.Side.BUY
                ? marketPrice.compareTo(limitPrice) <= 0
                : marketPrice.compareTo(limitPrice) >= 0;
    }

    /**
     * NEW -> FILLED (an order that crosses immediately at placement, MARKET
     * or LIMIT) or WORKING -> FILLED (a LIMIT order filled by a later
     * crossing tick). There is no PARTIALLY_FILLED path yet (that needs a
     * matching engine or partial-liquidity model this project doesn't
     * build).
     */
    public void fill() {
        requireStatusIn(Status.NEW, Status.WORKING);
        this.status = Status.FILLED;
    }

    /**
     * NEW -> REJECTED or WORKING -> REJECTED, recording why (see
     * RejectionReason). WORKING -> REJECTED is a tick-triggered fill
     * attempt that failed a compliance check the order originally passed
     * at placement (e.g. the account's position moved in the meantime) —
     * deliberately the same method and the same recorded reasons as a
     * placement-time rejection, rather than a separate failure path.
     */
    public void reject(RejectionReason reason) {
        requireStatusIn(Status.NEW, Status.WORKING);
        this.status = Status.REJECTED;
        this.rejectionReason = reason;
    }

    /** NEW -> WORKING: a LIMIT order that doesn't cross at placement. */
    public void markWorking() {
        requireStatusIn(Status.NEW);
        this.status = Status.WORKING;
    }

    /** WORKING -> EXPIRED, via the scheduled past-due sweep. */
    public void expire() {
        requireStatusIn(Status.WORKING);
        this.status = Status.EXPIRED;
    }

    private void requireStatusIn(Status... expected) {
        for (Status s : expected) {
            if (this.status == s) {
                return;
            }
        }
        throw new IllegalStateException(
                "Order " + id + " expected status in " + java.util.Arrays.toString(expected) + " but was " + status);
    }

    public UUID getId() {
        return id;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public String getSymbol() {
        return symbol;
    }

    public Trade.Side getSide() {
        return side;
    }

    public OrderType getOrderType() {
        return orderType;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public Status getStatus() {
        return status;
    }

    public RejectionReason getRejectionReason() {
        return rejectionReason;
    }

    public UUID getRequestId() {
        return requestId;
    }

    public String getRequestHash() {
        return requestHash;
    }

    public BigDecimal getLimitPrice() {
        return limitPrice;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
