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
 * Maps to the "trades" table created in
 * V10__trades_journal_audit_outbox.sql. Unlike Account, this entity IS
 * created by application code (LedgerService.postTrade), never by a DB
 * trigger — so, unlike Account, it needs a public constructor, and it
 * must generate its own id rather than relying on the column's
 * gen_random_uuid() default: with no @GeneratedValue, Hibernate uses
 * "assigned identifier" strategy and sends this object's id verbatim in
 * the INSERT, so the DB-side default never actually fires for
 * app-inserted rows.
 *
 * orderId is NOT NULL as of V11__orders.sql — every trade originates
 * from an order (MARKET fills today, LIMIT from Phase 8), per
 * BLUEPRINT.md §3 listing trades.order_id without "nullable".
 */
@Entity
@Table(name = "trades")
public class Trade {

    public enum Side {
        BUY, SELL
    }

    @Id
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "symbol", nullable = false)
    private String symbol;

    @Enumerated(EnumType.STRING)
    @Column(name = "side", nullable = false)
    private Side side;

    @Column(name = "quantity", nullable = false)
    private BigDecimal quantity;

    @Column(name = "price", nullable = false)
    private BigDecimal price;

    @Column(name = "executed_at", nullable = false)
    private OffsetDateTime executedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Trade() {
        // required by JPA
    }

    public Trade(UUID orderId, UUID accountId, String symbol, Side side, BigDecimal quantity, BigDecimal price, OffsetDateTime executedAt) {
        this.id = UUID.randomUUID();
        this.orderId = orderId;
        this.accountId = accountId;
        this.symbol = symbol;
        this.side = side;
        this.quantity = quantity;
        this.price = price;
        this.executedAt = executedAt;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public String getSymbol() {
        return symbol;
    }

    public Side getSide() {
        return side;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public OffsetDateTime getExecutedAt() {
        return executedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
