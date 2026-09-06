package com.tradepulse.ledgercore.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Maps to the "journal_lines" table created in
 * V10__trades_journal_audit_outbox.sql. amount is signed: positive =
 * credit to the account's cash_balance, negative = debit — see the
 * migration's comment on this table for why that's enforced in
 * application code (LedgerService.postTrade) rather than a DB CHECK.
 * App-created, so it generates its own id (see Trade's javadoc).
 */
@Entity
@Table(name = "journal_lines")
public class JournalLine {

    @Id
    private UUID id;

    @Column(name = "journal_entry_id", nullable = false)
    private UUID journalEntryId;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected JournalLine() {
        // required by JPA
    }

    public JournalLine(UUID journalEntryId, UUID accountId, BigDecimal amount) {
        this.id = UUID.randomUUID();
        this.journalEntryId = journalEntryId;
        this.accountId = accountId;
        this.amount = amount;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getJournalEntryId() {
        return journalEntryId;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
