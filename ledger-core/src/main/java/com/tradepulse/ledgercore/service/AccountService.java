package com.tradepulse.ledgercore.service;

import com.tradepulse.ledgercore.domain.Account;

import com.tradepulse.ledgercore.exception.AccountNotFoundException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The controller depends on this interface, not on AccountServiceImpl
 * directly (dependency inversion) — the ownership rule ("an account
 * belongs to exactly the user whose ID matches user_id") lives behind
 * this single seam, so it can be tested or swapped without touching
 * the web layer.
 */
public interface AccountService {

    Optional<Account> getAccountForUser(UUID userId);

    /**
     * Same ownership resolution as getAccountForUser, but gated behind
     * {@code account.read.own} first. getAccountForUser itself stays
     * permission-free because other services (OrderServiceImpl,
     * PortfolioServiceImpl, LedgerTransactionServiceImpl) reuse it purely
     * as an internal ownership lookup - the permission check for those
     * call sites already lives on their own outward-facing action (e.g.
     * positions.read.own), so gating getAccountForUser itself would
     * double-check unrelated permissions. This method is the one the
     * controller calls for the actual "read my account" action.
     */
    Optional<Account> getMyAccount(List<String> roles, UUID userId);

    /**
     * Resolves accountId for own, granted, or any access: ownership plus
     * {@code account.read.own}; a live account_grants row plus
     * {@code account.read.granted}; or (Phase 14 item 3) unconditional
     * access for a caller whose roles hold {@code account.read.any}
     * (Compliance) - no ownership or grant needed for that last tier.
     * Re-checked fresh on every call via AccountAccessService, never
     * cached. Unlike getMyAccount, this throws rather than returning
     * Optional, matching the exception-based convention the other
     * granted-read methods in this phase use (OrderService,
     * PortfolioService).
     *
     * @throws AccountNotFoundException if accountId doesn't exist, or
     *                                    exists but the caller neither
     *                                    owns it, holds a valid grant
     *                                    for it, nor holds
     *                                    account.read.any
     */
    Account getAccount(List<String> roles, UUID callerId, UUID accountId);
}