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
 * Maps to the "orders" table created in V11__orders.sql. App-created,
 * like Trade — see Trade's javadoc for why that means a public
 * constructor and an app-generated id rather than the column's
 * gen_random_uuid() default.
 *
 * Status changes go through fill()/reject() rather than a public setter,
 * so OrderServiceImpl (the only writer) can't push an order into a
 * state its own lifecycle doesn't allow — e.g. rejecting an order twice,
 * or filling one that was already rejected.
 */
@Entity
@Table(name = "orders")
public class Order {

    /**
     * MARKET only for now — deliberately a one-value enum rather than a
     * boolean/string, so Phase 8 adding LIMIT is an enum addition plus an
     * ALTER TABLE on the order_type CHECK, not a redesign. See
     * V11__orders.sql's comment for why limit_price/expires_at aren't
     * columns yet either.
     */
    public enum OrderType {
        MARKET
    }

    /**
     * All seven states are declared now even though Phase 3 only reaches
     * NEW/FILLED/REJECTED — WORKING/PARTIALLY_FILLED/EXPIRED belong to
     * Phase 8, CANCELLED to a not-yet-built cancel endpoint. Matches
     * V11__orders.sql's status CHECK, which spells out the full enum
     * up front per IMPLEMENTATION_PLAN.md's own Phase 3 task text.
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

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Order() {
        // required by JPA
    }

    public Order(UUID accountId, String symbol, Trade.Side side, OrderType orderType, BigDecimal quantity) {
        this.id = UUID.randomUUID();
        this.accountId = accountId;
        this.symbol = symbol;
        this.side = side;
        this.orderType = orderType;
        this.quantity = quantity;
        this.status = Status.NEW;
        this.createdAt = OffsetDateTime.now();
    }

    /**
     * NEW -> FILLED. MARKET orders in v1 fill immediately and in full —
     * there is no PARTIALLY_FILLED path yet (that needs a matching
     * engine or partial-liquidity model neither Phase 3 nor Phase 8
     * builds).
     */
    public void fill() {
        requireStatus(Status.NEW);
        this.status = Status.FILLED;
    }

    /**
     * NEW -> REJECTED, e.g. NO_MARKET/STALE_PRICE — see RejectionReason
     * for why the specific reason isn't stored on this entity.
     */
    public void reject() {
        requireStatus(Status.NEW);
        this.status = Status.REJECTED;
    }

    private void requireStatus(Status expected) {
        if (this.status != expected) {
            throw new IllegalStateException(
                    "Order " + id + " expected status " + expected + " but was " + status);
        }
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
