package com.tradepulse.ledgercore.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Maps to "compliance_cases" (V16). Compliance (or admin) opens a case
 * against an account, documenting a reason, and later closes it — kept
 * to a simple two-state lifecycle (OPEN/CLOSED), same as the checklist
 * asks for, rather than a richer workflow nothing has called for. Static
 * factory + guarded transition, same pattern as Order.market/Order.limit
 * and requireStatusIn from Phase 8 — construction can't skip the mandatory
 * reason, and close() can't be called twice. App-generates its own id,
 * same convention as Trade/AuditLog (see AuditLog's javadoc).
 */
@Entity
@Table(name = "compliance_cases")
public class ComplianceCase {

    public enum Status { OPEN, CLOSED }

    @Id
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "opened_by", nullable = false)
    private UUID openedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Column(name = "opened_at", nullable = false)
    private OffsetDateTime openedAt;

    @Column(name = "closed_by")
    private UUID closedBy;

    @Column(name = "closed_at")
    private OffsetDateTime closedAt;

    protected ComplianceCase() {
        // required by JPA
    }

    private ComplianceCase(UUID accountId, UUID openedBy, String reason) {
        this.id = UUID.randomUUID();
        this.accountId = accountId;
        this.openedBy = openedBy;
        this.status = Status.OPEN;
        this.reason = reason;
        this.openedAt = OffsetDateTime.now();
    }

    public static ComplianceCase open(UUID accountId, UUID openedBy, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason is required to open a compliance case");
        }
        return new ComplianceCase(accountId, openedBy, reason);
    }

    public void close(UUID closedBy) {
        if (status != Status.OPEN) {
            throw new IllegalStateException("Cannot close a case that is not OPEN (current status: " + status + ")");
        }
        this.status = Status.CLOSED;
        this.closedBy = closedBy;
        this.closedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public UUID getOpenedBy() {
        return openedBy;
    }

    public Status getStatus() {
        return status;
    }

    public String getReason() {
        return reason;
    }

    public OffsetDateTime getOpenedAt() {
        return openedAt;
    }

    public UUID getClosedBy() {
        return closedBy;
    }

    public OffsetDateTime getClosedAt() {
        return closedAt;
    }
}
