package com.tradepulse.ledgercore.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Maps to the "journal_entries" table created in
 * V10__trades_journal_audit_outbox.sql. One entry per trade; the actual
 * cash movement is recorded as one or more JournalLine rows against this
 * entry. App-created (see Trade's javadoc for why that means an
 * app-generated id rather than relying on gen_random_uuid()).
 */
@Entity
@Table(name = "journal_entries")
public class JournalEntry {

    @Id
    private UUID id;

    @Column(name = "trade_id", nullable = false)
    private UUID tradeId;

    @Column(name = "description")
    private String description;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected JournalEntry() {
        // required by JPA
    }

    public JournalEntry(UUID tradeId, String description) {
        this.id = UUID.randomUUID();
        this.tradeId = tradeId;
        this.description = description;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getTradeId() {
        return tradeId;
    }

    public String getDescription() {
        return description;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
