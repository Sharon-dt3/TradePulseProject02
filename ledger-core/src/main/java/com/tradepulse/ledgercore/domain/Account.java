package com.tradepulse.ledgercore.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Maps directly to the "accounts" table created in V1__baseline_accounts.sql.
 * Deliberately holds no business logic — that lives in AccountService.
 */
@Entity
@Table(name = "accounts")
public class Account {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "cash_balance", nullable = false)
    private BigDecimal cashBalance;

    @Column(name = "margin_enabled", nullable = false)
    private boolean marginEnabled;

    @Column(name = "frozen", nullable = false)
    private boolean frozen;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Account() {
        // required by JPA
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public BigDecimal getCashBalance() {
        return cashBalance;
    }

    public boolean isMarginEnabled() {
        return marginEnabled;
    }

    public boolean isFrozen() {
        return frozen;
    }

    /**
     * Phase 14 item 1: freezes the account so OrderServiceImpl.resolveOrder
     * rejects any new order against it (that check already existed from
     * an earlier phase; this is the only place that ever sets frozen to
     * true). Idempotent by design - AccountFreezeService only calls this
     * when the account isn't already frozen, but the method itself makes
     * no assumption about prior state either way.
     */
    public void freeze() {
        this.frozen = true;
    }

    /**
     * Reverses freeze(). See its javadoc.
     */
    public void unfreeze() {
        this.frozen = false;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}