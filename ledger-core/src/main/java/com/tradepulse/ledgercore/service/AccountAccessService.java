package com.tradepulse.ledgercore.service;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.repository.AccountGrantRepository;
import com.tradepulse.ledgercore.repository.AccountRepository;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * The single seam every "read someone else's account" endpoint goes
 * through (Phase 13 item 2). A caller reaches a given accountId one of
 * two ways - owns it, or holds a live account_grants row for it - and
 * either path still requires the matching permission on top (own vs
 * granted are separate permission strings, so a role can have one
 * without the other). A client-supplied accountId is never trusted by
 * itself: this always re-derives "is this actually readable by this
 * caller" from the database, fresh, on every call - no caching, so an
 * expired or revoked grant stops working on the very next request. A
 * caller with neither ownership nor a valid grant gets the exact same
 * AccountNotFoundException as a nonexistent accountId, so this never
 * confirms an account exists to someone who can't read it.
 *
 * Auditor is deliberately excluded from GRANT_PURPOSES even though
 * account_grants.purpose allows the value - Auditor's granted access is
 * date-range scoped via audit_engagements instead (Phase 16), a
 * different mechanism with different semantics (a window, not an
 * expiry), so it gets its own resolution path rather than being folded
 * in here.
 */
@Service
public class AccountAccessService {

    private static final List<String> GRANT_PURPOSES = List.of("delegated_viewer", "support");

    private final AccountRepository accountRepository;
    private final AccountGrantRepository accountGrantRepository;
    private final PermissionService permissionService;

    public AccountAccessService(
            AccountRepository accountRepository,
            AccountGrantRepository accountGrantRepository,
            PermissionService permissionService) {
        this.accountRepository = accountRepository;
        this.accountGrantRepository = accountGrantRepository;
        this.permissionService = permissionService;
    }

    /**
     * @param ownPermission     required if the caller owns accountId
     * @param grantedPermission required if the caller instead holds a
     *                          live account_grants row for accountId
     * @throws AccountNotFoundException if accountId doesn't exist, or
     *                                   exists but the caller neither
     *                                   owns it nor holds a valid grant
     *                                   for it
     */
    public Account resolveReadableAccount(
            List<String> roles, UUID callerId, UUID accountId,
            String ownPermission, String grantedPermission) {

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> AccountNotFoundException.forAccountId(accountId));

        if (account.getUserId().equals(callerId)) {
            permissionService.requirePermission(roles, ownPermission);
            return account;
        }

        boolean hasGrant = accountGrantRepository.existsByAccountIdAndGrantedToUserIdAndPurposeInAndExpiresAtAfter(
                accountId, callerId, GRANT_PURPOSES, OffsetDateTime.now());
        if (!hasGrant) {
            throw AccountNotFoundException.forAccountId(accountId);
        }

        permissionService.requirePermission(roles, grantedPermission);
        return account;
    }
}
