package com.tradepulse.ledgercore.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Read-only mapping of Supabase Storage's own storage.objects table -
 * ledger-core never writes rows here directly (Storage's own API owns
 * object lifecycle), only reads via StatementRetentionJob to find
 * candidates for deletion. Only the columns that job needs are mapped;
 * storage.objects has several others (owner, metadata, path_tokens, ...)
 * that are irrelevant here and safely left unmapped under ddl-auto:
 * validate, which only checks that mapped columns exist.
 */
@Entity
@Table(name = "objects", schema = "storage")
public class StorageObject {

    @Id
    private UUID id;

    @Column(name = "bucket_id")
    private String bucketId;

    @Column(name = "name")
    private String name;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    protected StorageObject() {
        // required by JPA; ledger-core never constructs these directly
    }

    public UUID getId() {
        return id;
    }

    public String getBucketId() {
        return bucketId;
    }

    public String getName() {
        return name;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
