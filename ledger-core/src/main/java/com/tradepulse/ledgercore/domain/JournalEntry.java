package com.tradepulse.ledgercore.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Maps to the "journal_entries" table (V10__trades_journal_audit_outbox.sql,
 * widened by V20__ledger_adjustments.sql). One entry per trade OR per
 * admin ledger adjustment - never both, never neither (see the
 * migration's journal_entries_exactly_one_source CHECK). The actual
 * cash movement is recorded as one or more JournalLine rows against
 * this entry. App-created (see Trade's javadoc for why that means an
 * app-generated id rather than relying on gen_random_uuid()).
 */
@Entity
@Table(name = "journal_entries")
public class JournalEntry {

    @Id
    private UUID id;

    @Column(name = "trade_id")
    private UUID tradeId;

    @Column(name = "adjustment_id")
    private UUID adjustmentId;

    @Column(name = "description")
    private String description;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected JournalEntry() {
        // required by JPA
    }

    private JournalEntry(UUID tradeId, UUID adjustmentId, String description) {
        this.id = UUID.randomUUID();
        this.tradeId = tradeId;
        this.adjustmentId = adjustmentId;
        this.description = description;
        this.createdAt = OffsetDateTime.now();
    }

    public static JournalEntry forTrade(UUID tradeId, String description) {
        return new JournalEntry(tradeId, null, description);
    }

    public static JournalEntry forAdjustment(UUID adjustmentId, String description) {
        return new JournalEntry(null, adjustmentId, description);
    }

    public UUID getId() {
        return id;
    }

    public UUID getTradeId() {
        return tradeId;
    }

    public UUID getAdjustmentId() {
        return adjustmentId;
    }

    public String getDescription() {
        return description;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
