package com.tradepulse.ledgercore.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.repository.AccountRepository;
import com.tradepulse.ledgercore.repository.AuditLogRepository;

/**
 * Phase 14 item 1: Compliance (and Admin, which also holds
 * accounts.freeze per V3) can freeze/unfreeze any account. This is the
 * only place Account.freeze()/unfreeze() are ever called - Order
 * rejection for a frozen account is pre-existing logic
 * (OrderServiceImpl.resolveOrder, an earlier phase) that this service
 * doesn't touch, it only flips the flag that logic already reads.
 *
 * Every call is audit-logged with the caller-supplied reason
 * regardless of whether the flag actually changed, since attempting to
 * freeze an already-frozen account (or unfreeze an already-unfrozen
 * one) is still a compliance action worth a paper trail - but the
 * account is only re-saved when isFrozen() is actually changing, so a
 * repeat call is a harmless no-op write-wise.
 */
@Service
public class AccountFreezeService {

    private static final String ACCOUNTS_FREEZE_PERMISSION = "accounts.freeze";

    private final AccountRepository accountRepository;
    private final AuditLogRepository auditLogRepository;
    private final PermissionService permissionService;

    public AccountFreezeService(
            AccountRepository accountRepository,
            AuditLogRepository auditLogRepository,
            PermissionService permissionService) {
        this.accountRepository = accountRepository;
        this.auditLogRepository = auditLogRepository;
        this.permissionService = permissionService;
    }

    @Transactional
    public Account freeze(List<String> roles, UUID actorUserId, UUID accountId, String reason) {
        permissionService.requirePermission(roles, ACCOUNTS_FREEZE_PERMISSION);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> AccountNotFoundException.forAccountId(accountId));

        if (!account.isFrozen()) {
            account.freeze();
            accountRepository.save(account);
        }

        auditLogRepository.save(new AuditLog(
                actorUserId,
                "ACCOUNT_FROZEN",
                "account",
                accountId,
                Map.of("reason", reason)
        ));

        return account;
    }

    @Transactional
    public Account unfreeze(List<String> roles, UUID actorUserId, UUID accountId, String reason) {
        permissionService.requirePermission(roles, ACCOUNTS_FREEZE_PERMISSION);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> AccountNotFoundException.forAccountId(accountId));

        if (account.isFrozen()) {
            account.unfreeze();
            accountRepository.save(account);
        }

        auditLogRepository.save(new AuditLog(
                actorUserId,
                "ACCOUNT_UNFROZEN",
                "account",
                accountId,
                Map.of("reason", reason)
        ));

        return account;
    }
}
