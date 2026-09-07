package com.tradepulse.ledgercore.service;

import java.util.List;
import java.util.UUID;

import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.web.dto.TransactionDto;

/**
 * Phase 12: the last piece of "a trader can fully self-serve without a
 * manual SQL query" - the underlying journal (trades, fees,
 * adjustments), not just the trade-level view GET /trades already gives.
 */
public interface LedgerTransactionService {

    /**
     * Every journal line against the caller's own account, newest first.
     *
     * @throws AccountNotFoundException if userId has no account
     */
    List<TransactionDto> listTransactions(List<String> roles, UUID userId);
}
