package com.tradepulse.ledgercore.service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

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

    private final AccountRepository accountRepository;
    private final TradeRepository tradeRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final JournalLineRepository journalLineRepository;
    private final AuditLogRepository auditLogRepository;
    private final OutboxRepository outboxRepository;

    public LedgerServiceImpl(
            AccountRepository accountRepository,
            TradeRepository tradeRepository,
            JournalEntryRepository journalEntryRepository,
            JournalLineRepository journalLineRepository,
            AuditLogRepository auditLogRepository,
            OutboxRepository outboxRepository
    ) {
        this.accountRepository = accountRepository;
        this.tradeRepository = tradeRepository;
        this.journalEntryRepository = journalEntryRepository;
        this.journalLineRepository = journalLineRepository;
        this.auditLogRepository = auditLogRepository;
        this.outboxRepository = outboxRepository;
    }

    /**
     * One @Transactional write covering trade + journal + cash + audit +
     * outbox, per IMPLEMENTATION_PLAN.md Phase 3. Every later phase that
     * touches trades posts through this same method rather than opening
     * its own transaction, so this is the only place these five concerns
     * can ever drift out of sync with each other - if any step below
     * fails, the whole trade never happened, not partially.
     */
    @Override
    @Transactional
    public Trade postTrade(UUID accountId, UUID actorUserId, String symbol, Trade.Side side,
                            BigDecimal quantity, BigDecimal price, OffsetDateTime executedAt) {

        // BUY debits cash (the account pays), SELL credits it (the
        // account receives) - same sign convention as journal_lines.amount.
        BigDecimal notional = quantity.multiply(price);
        BigDecimal cashDelta = side == Trade.Side.BUY ? notional.negate() : notional;

        // Existence check first: this is the cheapest way to fail fast on
        // an unknown accountId, before constructing any of the other rows.
        // Doesn't change correctness either way - @Transactional means a
        // later failure would roll back everything already built - but
        // this avoids wasted work on the common failure path.
        int rowsUpdated = accountRepository.adjustCashBalance(accountId, cashDelta);
        if (rowsUpdated == 0) {
            throw new AccountNotFoundException(accountId);
        }

        Trade trade = new Trade(accountId, symbol, side, quantity, price, executedAt);
        tradeRepository.save(trade);

        JournalEntry journalEntry = new JournalEntry(trade.getId(), "Trade settlement for " + symbol);
        journalEntryRepository.save(journalEntry);

        JournalLine journalLine = new JournalLine(journalEntry.getId(), accountId, cashDelta);
        journalLineRepository.save(journalLine);

        AuditLog auditLog = new AuditLog(
                actorUserId,
                "TRADE_POSTED",
                "trade",
                trade.getId(),
                Map.of(
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
}
