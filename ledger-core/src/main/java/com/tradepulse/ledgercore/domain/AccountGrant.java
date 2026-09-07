package com.tradepulse.ledgercore.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Maps to account_grants (V2__rbac_schema.sql). A time-boxed,
 * reason-logged permission for one user to read one account they don't
 * own - the mechanism behind Delegated Viewer and Support access (Phase
 * 13/15). Deliberately holds no business logic; the "is this grant still
 * valid" check lives in AccountGrantRepository's query (expires_at after
 * now, evaluated fresh on every request - never cached) per Phase 13's
 * expiry rule: a grant stops working on the very next request after it
 * expires, no deployment or cache clear needed.
 */
@Entity
@Table(name = "account_grants")
public class AccountGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "granted_to_user_id", nullable = false)
    private UUID grantedToUserId;

    @Column(name = "purpose", nullable = false)
    private String purpose;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected AccountGrant() {
        // required by JPA
    }

    public Long getId() {
        return id;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public UUID getGrantedToUserId() {
        return grantedToUserId;
    }

    public String getPurpose() {
        return purpose;
    }

    public String getReason() {
        return reason;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
