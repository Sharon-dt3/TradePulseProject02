package com.tradepulse.ledgercore.service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.tradepulse.ledgercore.domain.Trade;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;

/**
 * The single write path for recording an executed trade. Every later
 * phase that touches trades (fees in Phase 6, orders in this phase)
 * posts through this same seam, in one transaction covering trade +
 * journal + cash + audit + outbox — never a separate transaction per
 * concern. See LedgerServiceImpl for why that matters.
 */
public interface LedgerService {

    /**
     * Records an executed trade: inserts the Trade row, a JournalEntry
     * with one JournalLine for the account's cash movement, applies that
     * same delta to the account's cash_balance, writes an AuditLog
     * entry, and enqueues an Outbox event for later relay (Phase 7's
     * risk-engine consumer group) — all in one transaction.
     *
     * @param orderId    the order this fill belongs to (see OrderServiceImpl,
     *                   the only caller as of Phase 3) — callers are expected
     *                   to be @Transactional themselves so this join the same
     *                   transaction as their own order-status update, per this
     *                   interface's "never a separate transaction" rule above.
     * @param accountId  the account the trade is posted against
     * @param actorUserId the user who initiated this (may differ from
     *                    the account's owner via account_grants; recorded
     *                    on the audit log, not assumed to be the owner)
     * @throws AccountNotFoundException if accountId doesn't exist
     */
    Trade postTrade(UUID orderId, UUID accountId, UUID actorUserId, String symbol, Trade.Side side,
                     BigDecimal quantity, BigDecimal price, OffsetDateTime executedAt);
}
