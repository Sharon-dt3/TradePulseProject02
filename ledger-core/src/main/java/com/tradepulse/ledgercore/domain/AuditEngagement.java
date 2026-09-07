package com.tradepulse.ledgercore.domain;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Maps to audit_engagements (V17__audit_engagements.sql). A bounded
 * historical scope_start_date/scope_end_date window letting one auditor
 * read one account's trades within that range (see the
 * trades_select_auditor_scoped RLS policy) - the Auditor-specific
 * counterpart to account_grants' open-ended expires_at model. Kept as
 * its own table/entity rather than folded into AccountGrant because a
 * bounded date range is a genuinely different shape than a single
 * expiry cutoff (see V17's own migration comment).
 *
 * No update/revoke method: unlike AccountGrant, an engagement's scope is
 * fixed at creation - it naturally stops granting access once
 * scope_end_date passes, so there's nothing to retract early.
 */
@Entity
@Table(name = "audit_engagements")
public class AuditEngagement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "auditor_user_id", nullable = false)
    private UUID auditorUserId;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Column(name = "scope_start_date", nullable = false)
    private LocalDate scopeStartDate;

    @Column(name = "scope_end_date", nullable = false)
    private LocalDate scopeEndDate;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected AuditEngagement() {
        // required by JPA
    }

    private AuditEngagement(
            UUID accountId, UUID auditorUserId, String reason,
            LocalDate scopeStartDate, LocalDate scopeEndDate) {
        this.accountId = accountId;
        this.auditorUserId = auditorUserId;
        this.reason = reason;
        this.scopeStartDate = scopeStartDate;
        this.scopeEndDate = scopeEndDate;
        this.createdAt = OffsetDateTime.now();
    }

    public static AuditEngagement create(
            UUID accountId, UUID auditorUserId, String reason,
            LocalDate scopeStartDate, LocalDate scopeEndDate) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason must not be blank");
        }
        if (scopeEndDate.isBefore(scopeStartDate)) {
            throw new IllegalArgumentException("scopeEndDate must not be before scopeStartDate");
        }
        return new AuditEngagement(accountId, auditorUserId, reason, scopeStartDate, scopeEndDate);
    }

    public Long getId() {
        return id;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public UUID getAuditorUserId() {
        return auditorUserId;
    }

    public String getReason() {
        return reason;
    }

    public LocalDate getScopeStartDate() {
        return scopeStartDate;
    }

    public LocalDate getScopeEndDate() {
        return scopeEndDate;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
