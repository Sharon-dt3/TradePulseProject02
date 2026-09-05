package com.tradepulse.ledgercore.service;

import com.tradepulse.ledgercore.domain.Account;

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
}