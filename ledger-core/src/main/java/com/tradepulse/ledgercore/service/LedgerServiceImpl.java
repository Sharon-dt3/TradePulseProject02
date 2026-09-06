package com.tradepulse.ledgercore.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.domain.JournalEntry;
import com.tradepulse.ledgercore.domain.JournalLine;
import com.tradepulse.ledgercore.domain.Outbox;
import com.tradepulse.ledgercore.domain.Trade;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.repository.AccountRepository;
import com.tradepulse.ledgercore.repository.AuditLogRepository;
import com.tradepulse.ledgercore.repository.JournalEntryRepository;
import com.tradepulse.ledgercore.repository.JournalLineRepository;
import com.tradepulse.ledgercore.repository.OutboxRepository;
import com.tradepulse.ledgercore.repository.TradeRepository;

@Service
public class LedgerServiceImpl implements LedgerService {

    private static final int COMMISSION_BPS_SCALE = 10_000;

    private final AccountRepository accountRepository;
    private final TradeRepository tradeRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final JournalLineRepository journalLineRepository;
    private final AuditLogRepository auditLogRepository;
    private final OutboxRepository outboxRepository;
    private final long commissionBps;
    private final UUID houseAccountId;

    public LedgerServiceImpl(
            AccountRepository accountRepository,
            TradeRepository tradeRepository,
            JournalEntryRepository journalEntryRepository,
            JournalLineRepository journalLineRepository,
            AuditLogRepository auditLogRepository,
            OutboxRepository outboxRepository,
            @Value("${ledger.commission-bps}") long commissionBps,
            @Value("${ledger.house-account-id}") UUID houseAccountId
    ) {
        this.accountRepository = accountRepository;
        this.tradeRepository = tradeRepository;
        this.journalEntryRepository = journalEntryRepository;
        this.journalLineRepository = journalLineRepository;
        this.auditLogRepository = auditLogRepository;
        this.outboxRepository = outboxRepository;
        this.commissionBps = commissionBps;
        this.houseAccountId = houseAccountId;
    }

    /**
     * One @Transactional write covering trade + journal + cash + audit +
     * outbox, per IMPLEMENTATION_PLAN.md Phase 3. Every later phase that
     * touches trades posts through this same method rather than opening
     * its own transaction, so this is the only place these five concerns
     * can ever drift out of sync with each other - if any step below
     * fails, the whole trade never happened, not partially.
     *
     * Phase 6: a commission fee is computed on the notional and posted as
     * its own balanced journal-line pair (trading account debited,
     * house account credited via ledger.house-account-id /
     * V14__house_fees_account.sql) alongside the pre-existing principal
     * cash-movement line - see postFee's javadoc for why it's a separate
     * pair rather than folded into the principal line.
     */
    @Override
    @Transactional
    public Trade postTrade(UUID orderId, UUID accountId, UUID actorUserId, String symbol, Trade.Side side,
                            BigDecimal quantity, BigDecimal price, OffsetDateTime executedAt) {

        // BUY debits cash (the account pays), SELL credits it (the
        // account receives) - same sign convention as journal_lines.amount.
        BigDecimal notional = quantity.multiply(price);
        BigDecimal cashDelta = side == Trade.Side.BUY ? notional.negate() : notional;
        BigDecimal fee = computeFee(notional);

        // Combined principal+fee delta applied in one UPDATE - see
        // postFee's javadoc for why this is still recorded as two
        // separate journal_lines rather than one merged line.
        int rowsUpdated = accountRepository.adjustCashBalance(accountId, cashDelta.subtract(fee));
        if (rowsUpdated == 0) {
            throw AccountNotFoundException.forAccountId(accountId);
        }

        Trade trade = new Trade(orderId, accountId, symbol, side, quantity, price, executedAt);
        tradeRepository.save(trade);

        JournalEntry journalEntry = new JournalEntry(trade.getId(), "Trade settlement for " + symbol);
        journalEntryRepository.save(journalEntry);

        JournalLine journalLine = new JournalLine(journalEntry.getId(), accountId, cashDelta);
        journalLineRepository.save(journalLine);

        postFee(journalEntry.getId(), accountId, fee);

        AuditLog auditLog = new AuditLog(
                actorUserId,
                "TRADE_POSTED",
                "trade",
                trade.getId(),
                Map.of(
                        "orderId", orderId.toString(),
                        "accountId", accountId.toString(),
                        "symbol", symbol,
                        "side", side.name(),
                        "quantity", quantity,
                        "price", price
                )
        );
        auditLogRepository.save(auditLog);

        Outbox outbox = new Outbox(
                "trade",
                trade.getId(),
                "TradePosted",
                Map.of(
                        "orderId", orderId.toString(),
                        "accountId", accountId.toString(),
                        "symbol", symbol,
                        "side", side.name(),
                        "quantity", quantity,
                        "price", price,
                        "executedAt", executedAt.toString()
                )
        );
        outboxRepository.save(outbox);

        return trade;
    }

    /**
     * fee = notional x (commissionBps / 10_000), rounded HALF_UP to
     * numeric(19,4) - standard rounding for a currency amount, and
     * consistent with every other money value in this codebase already
     * being numeric(19,4).
     */
    private BigDecimal computeFee(BigDecimal notional) {
        return notional
                .multiply(BigDecimal.valueOf(commissionBps))
                .divide(BigDecimal.valueOf(COMMISSION_BPS_SCALE), 4, RoundingMode.HALF_UP);
    }

    /**
     * Posts the fee as its own balanced journal-line pair - a -fee line
     * on the trading account, a +fee line on the house account - under
     * the SAME journal_entry_id as the trade's principal line, per
     * JournalEntry's own javadoc ("one or more JournalLine rows" against
     * one entry per trade).
     *
     * This is deliberately a separate pair rather than folding the fee
     * into the principal line's amount: the principal line documents
     * exactly the notional cash movement the trade itself caused,
     * unchanged from Phase 3; the fee pair documents exactly what the
     * fee did, and nothing else. Merging them into one number per
     * account would make it impossible to later audit "how much of this
     * trade's cash movement was the fee" from journal_lines alone.
     *
     * The trading account's actual cash_balance update already happened
     * in postTrade (combined with the principal delta in one UPDATE);
     * only the house account's cash_balance is updated here.
     */
    private void postFee(UUID journalEntryId, UUID accountId, BigDecimal fee) {
        JournalLine feeDebit = new JournalLine(journalEntryId, accountId, fee.negate());
        journalLineRepository.save(feeDebit);

        int houseRowsUpdated = accountRepository.adjustCashBalance(houseAccountId, fee);
        if (houseRowsUpdated == 0) {
            // Not a bad request - this means ledger.house-account-id is
            // misconfigured or V14__house_fees_account.sql never ran,
            // either of which is an operational setup bug, not something
            // a caller did wrong.
            throw new IllegalStateException(
                    "House fees account " + houseAccountId + " not found - "
                            + "check ledger.house-account-id and V14__house_fees_account.sql");
        }

        JournalLine feeCredit = new JournalLine(journalEntryId, houseAccountId, fee);
        journalLineRepository.save(feeCredit);
    }
}
