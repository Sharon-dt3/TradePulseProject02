package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.tradepulse.ledgercore.domain.JournalEntry;
import com.tradepulse.ledgercore.domain.JournalLine;

/**
 * Response body for GET /ledger/transactions - one row per JournalLine
 * (this account's actual signed cash movement), with its JournalEntry's
 * description and origin (tradeId xor adjustmentId, per
 * JournalEntry.forTrade/forAdjustment) folded in. This is the
 * underlying journal itself - a trade with a fee shows up as two lines
 * here, not folded into one row the way GET /trades represents a fill.
 */
public record TransactionDto(
        UUID journalEntryId,
        UUID tradeId,
        UUID adjustmentId,
        String description,
        BigDecimal amount,
        OffsetDateTime createdAt
) {
    public static TransactionDto from(JournalLine line, JournalEntry entry) {
        return new TransactionDto(
                entry.getId(), entry.getTradeId(), entry.getAdjustmentId(),
                entry.getDescription(), line.getAmount(), line.getCreatedAt()
        );
    }
}
