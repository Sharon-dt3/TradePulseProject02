package com.tradepulse.ledgercore.service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tradepulse.ledgercore.domain.AuditEngagement;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.exception.InvalidAuditEngagementRequestException;
import com.tradepulse.ledgercore.exception.UserNotFoundException;
import com.tradepulse.ledgercore.repository.AccountRepository;
import com.tradepulse.ledgercore.repository.AuditEngagementRepository;
import com.tradepulse.ledgercore.repository.AuthUserRepository;

/**
 * Phase 18 item 2: Admin creates audit_engagements - the write side of
 * the Auditor date-range access model (V17__audit_engagements.sql; see
 * AccountGrantService's javadoc for why Auditor doesn't use
 * account_grants). No revoke here by design: an engagement is a bounded
 * historical window, not an open-ended grant to retract.
 */
@Service
public class AuditEngagementService {

    private static final String ENGAGEMENT_MANAGE_PERMISSION = "audit.engagement.manage";

    private final AuditEngagementRepository auditEngagementRepository;
    private final AccountRepository accountRepository;
    private final AuthUserRepository authUserRepository;
    private final PermissionService permissionService;

    public AuditEngagementService(
            AuditEngagementRepository auditEngagementRepository,
            AccountRepository accountRepository,
            AuthUserRepository authUserRepository,
            PermissionService permissionService) {
        this.auditEngagementRepository = auditEngagementRepository;
        this.accountRepository = accountRepository;
        this.authUserRepository = authUserRepository;
        this.permissionService = permissionService;
    }

    @Transactional
    public AuditEngagement createEngagement(
            List<String> callerRoles, UUID accountId, UUID auditorUserId,
            String reason, LocalDate scopeStartDate, LocalDate scopeEndDate) {
        permissionService.requirePermission(callerRoles, ENGAGEMENT_MANAGE_PERMISSION);

        if (scopeEndDate.isBefore(scopeStartDate)) {
            throw InvalidAuditEngagementRequestException.invalidDateRange();
        }
        if (!accountRepository.existsById(accountId)) {
            throw AccountNotFoundException.forAccountId(accountId);
        }
        if (!authUserRepository.existsById(auditorUserId)) {
            throw UserNotFoundException.forUserId(auditorUserId);
        }

        AuditEngagement engagement =
                AuditEngagement.create(accountId, auditorUserId, reason, scopeStartDate, scopeEndDate);
        return auditEngagementRepository.save(engagement);
    }
}
