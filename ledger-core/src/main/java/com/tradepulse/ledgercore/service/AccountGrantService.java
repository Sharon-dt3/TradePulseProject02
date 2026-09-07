package com.tradepulse.ledgercore.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tradepulse.ledgercore.domain.AccountGrant;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.exception.GrantNotFoundException;
import com.tradepulse.ledgercore.exception.InvalidGrantRequestException;
import com.tradepulse.ledgercore.exception.UserNotFoundException;
import com.tradepulse.ledgercore.repository.AccountGrantRepository;
import com.tradepulse.ledgercore.repository.AccountRepository;
import com.tradepulse.ledgercore.repository.AuthUserRepository;

/**
 * Phase 18 item 2: Admin issues and revokes account_grants for
 * Delegated Viewer and Support access - the write side of the seam
 * Phase 13's AccountAccessService only ever reads from. Auditor access
 * is a separate model (audit_engagements, see AuditEngagementService)
 * so 'auditor' is deliberately excluded from the purposes this accepts,
 * even though account_grants' own CHECK constraint allows it.
 */
@Service
public class AccountGrantService {

    private static final String GRANT_MANAGE_PERMISSION = "account.grant.manage";
    private static final Set<String> VALID_GRANT_PURPOSES = Set.of("delegated_viewer", "support");

    private final AccountGrantRepository accountGrantRepository;
    private final AccountRepository accountRepository;
    private final AuthUserRepository authUserRepository;
    private final PermissionService permissionService;

    public AccountGrantService(
            AccountGrantRepository accountGrantRepository,
            AccountRepository accountRepository,
            AuthUserRepository authUserRepository,
            PermissionService permissionService) {
        this.accountGrantRepository = accountGrantRepository;
        this.accountRepository = accountRepository;
        this.authUserRepository = authUserRepository;
        this.permissionService = permissionService;
    }

    @Transactional
    public AccountGrant issueGrant(
            List<String> callerRoles, UUID accountId, UUID grantedToUserId,
            String purpose, String reason, OffsetDateTime expiresAt) {
        permissionService.requirePermission(callerRoles, GRANT_MANAGE_PERMISSION);

        if (!VALID_GRANT_PURPOSES.contains(purpose)) {
            throw InvalidGrantRequestException.invalidPurpose(purpose);
        }
        if (!accountRepository.existsById(accountId)) {
            throw AccountNotFoundException.forAccountId(accountId);
        }
        if (!authUserRepository.existsById(grantedToUserId)) {
            throw UserNotFoundException.forUserId(grantedToUserId);
        }

        AccountGrant grant = AccountGrant.issue(accountId, grantedToUserId, purpose, reason, expiresAt);
        return accountGrantRepository.save(grant);
    }

    @Transactional
    public void revokeGrant(List<String> callerRoles, Long grantId) {
        permissionService.requirePermission(callerRoles, GRANT_MANAGE_PERMISSION);

        AccountGrant grant = accountGrantRepository.findById(grantId)
                .orElseThrow(() -> GrantNotFoundException.forId(grantId));
        grant.revoke();
        accountGrantRepository.save(grant);
    }

    /**
     * Phase 20 prerequisite: same account.grant.manage permission as
     * issue/revoke - listing who has a grant on an account is no more
     * sensitive than granting one. Without this, the grants UI could
     * issue but never revoke, since grantId was otherwise unknowable.
     */
    public List<AccountGrant> listGrantsForAccount(List<String> callerRoles, UUID accountId) {
        permissionService.requirePermission(callerRoles, GRANT_MANAGE_PERMISSION);

        if (!accountRepository.existsById(accountId)) {
            throw AccountNotFoundException.forAccountId(accountId);
        }
        return accountGrantRepository.findByAccountIdOrderByCreatedAtDesc(accountId);
    }
}
