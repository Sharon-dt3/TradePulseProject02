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
 * Maps to "ledger_adjustments" (V20__ledger_adjustments.sql). Phase 10's
 * dual-control admin adjustment: LedgerAdjustmentService's
 * proposeAdjustment/approveAdjustment are the only writers. The
 * database's ledger_adjustments_dual_control CHECK (proposed_by <>
 * approved_by) is the real four-eyes enforcement - approve()'s own
 * guard here only covers the PROPOSED-\>APPROVED state transition;
 * the self-approval rule itself lives in the service layer
 * (ForbiddenException.selfApprovalNotAllowed), since "who may approve
 * this" is an authorization question, not a transition-validity one.
 */
@Entity
@Table(name = "ledger_adjustments")
public class LedgerAdjustment {

    public enum Status {
        PROPOSED, APPROVED
    }

    @Id
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "proposed_by", nullable = false)
    private UUID proposedBy;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status;

    @Column(name = "proposed_at", nullable = false)
    private OffsetDateTime proposedAt;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    protected LedgerAdjustment() {
        // required by JPA
    }

    private LedgerAdjustment(UUID accountId, UUID proposedBy, BigDecimal amount, String reason) {
        this.id = UUID.randomUUID();
        this.accountId = accountId;
        this.proposedBy = proposedBy;
        this.amount = amount;
        this.reason = reason;
        this.status = Status.PROPOSED;
        this.proposedAt = OffsetDateTime.now();
    }

    public static LedgerAdjustment propose(UUID accountId, UUID proposedBy, BigDecimal amount, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason must not be blank");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("amount must be non-zero");
        }
        return new LedgerAdjustment(accountId, proposedBy, amount, reason);
    }

    /** Flips PROPOSED -\> APPROVED. See the class javadoc for why the
     * self-approval rule is enforced elsewhere, not here. */
    public void approve(UUID approvedBy) {
        if (status != Status.PROPOSED) {
            throw new IllegalStateException("Cannot approve a ledger adjustment in status " + status);
        }
        this.approvedBy = approvedBy;
        this.status = Status.APPROVED;
        this.approvedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public UUID getProposedBy() {
        return proposedBy;
    }

    public UUID getApprovedBy() {
        return approvedBy;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getReason() {
        return reason;
    }

    public Status getStatus() {
        return status;
    }

    public OffsetDateTime getProposedAt() {
        return proposedAt;
    }

    public OffsetDateTime getApprovedAt() {
        return approvedAt;
    }
}
