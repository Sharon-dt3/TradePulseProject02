package com.tradepulse.ledgercore.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tradepulse.ledgercore.domain.Outbox;

/**
 * Spring Data JPA generates the implementation at runtime.
 */
public interface OutboxRepository extends JpaRepository<Outbox, UUID> {

    /**
     * Rows OutboxRelay still needs to XADD to its Redis stream, oldest
     * first. Mirrors idx_outbox_unpublished (a partial index on
     * created_at WHERE published_at IS NULL) from
     * V10__trades_journal_audit_outbox.sql.
     */
    List<Outbox> findByPublishedAtIsNullOrderByCreatedAtAsc();

    /**
     * Atomically marks a row published after a successful XADD, for the
     * same reason AccountRepository.adjustCashBalance is atomic rather
     * than a load-mutate-save cycle: Outbox has no setPublishedAt, so
     * this is the only way this field ever changes.
     */
    @Modifying
    @Query("UPDATE Outbox o SET o.publishedAt = :publishedAt WHERE o.id = :id")
    int markPublished(@Param("id") UUID id, @Param("publishedAt") OffsetDateTime publishedAt);
}
