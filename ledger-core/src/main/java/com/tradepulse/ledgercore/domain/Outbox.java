package com.tradepulse.ledgercore.domain;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Maps to the "outbox" table created in
 * V10__trades_journal_audit_outbox.sql. publishedAt is nullable and set
 * only once OutboxRelay successfully XADDs this row to its Redis stream
 * - see that migration's comment for why the row is never deleted on
 * success. There is deliberately no setPublishedAt here: like
 * Account.cashBalance, that update belongs in OutboxRepository as an
 * atomic UPDATE (added alongside OutboxRelay), not a load-mutate-save
 * cycle on this entity. App-created, so it generates its own id (see
 * Trade's javadoc); publishedAt starts null.
 */
@Entity
@Table(name = "outbox")
public class Outbox {

    @Id
    private UUID id;

    @Column(name = "aggregate_type", nullable = false)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false)
    private UUID aggregateId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    protected Outbox() {
        // required by JPA
    }

    public Outbox(String aggregateType, UUID aggregateId, String eventType, Map<String, Object> payload) {
        this.id = UUID.randomUUID();
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.payload = payload;
        this.createdAt = OffsetDateTime.now();
        this.publishedAt = null;
    }

    public UUID getId() {
        return id;
    }

    public String getAggregateType() {
        return aggregateType;
    }

    public UUID getAggregateId() {
        return aggregateId;
    }

    public String getEventType() {
        return eventType;
    }

    public Map<String, Object> getPayload() {
        return payload;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }
}
