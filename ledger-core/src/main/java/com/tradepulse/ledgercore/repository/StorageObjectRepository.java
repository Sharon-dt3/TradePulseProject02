package com.tradepulse.ledgercore.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.StorageObject;

/**
 * Backs StatementRetentionJob's search for statement objects past
 * retention-years. Read-only, like the entity it maps - this repository
 * is never used to save() or delete() a StorageObject; actual deletion
 * goes through the Storage HTTP API instead (see StatementRetentionJob).
 */
public interface StorageObjectRepository extends JpaRepository<StorageObject, UUID> {
    List<StorageObject> findByBucketIdAndCreatedAtBefore(String bucketId, OffsetDateTime cutoff);
}
