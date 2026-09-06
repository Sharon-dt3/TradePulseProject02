package com.tradepulse.ledgercore.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.domain.ComplianceCase;
import com.tradepulse.ledgercore.exception.ComplianceCaseNotFoundException;
import com.tradepulse.ledgercore.repository.AuditLogRepository;
import com.tradepulse.ledgercore.repository.ComplianceCaseRepository;

/**
 * Opening/closing a compliance case requires compliance.case.write (held
 * by compliance and admin, seeded in V3) — checked here, not in the
 * controller, matching this codebase's "controllers do routing only"
 * split (see OrderController's javadoc). Both actions are audit-logged
 * via the existing generic audit_log table (entity_type =
 * "compliance_case"), the same mechanism ORDER_REJECTED/TRADE_POSTED
 * already use — no new audit machinery needed.
 */
@Service
public class ComplianceCaseService {

    private static final String CASE_WRITE_PERMISSION = "compliance.case.write";

    private final ComplianceCaseRepository complianceCaseRepository;
    private final AuditLogRepository auditLogRepository;
    private final PermissionService permissionService;

    public ComplianceCaseService(
            ComplianceCaseRepository complianceCaseRepository,
            AuditLogRepository auditLogRepository,
            PermissionService permissionService) {
        this.complianceCaseRepository = complianceCaseRepository;
        this.auditLogRepository = auditLogRepository;
        this.permissionService = permissionService;
    }

    public ComplianceCase openCase(List<String> roles, UUID actorUserId, UUID accountId, String reason) {
        permissionService.requirePermission(roles, CASE_WRITE_PERMISSION);

        ComplianceCase complianceCase = ComplianceCase.open(accountId, actorUserId, reason);
        complianceCaseRepository.save(complianceCase);

        auditLogRepository.save(new AuditLog(
                actorUserId,
                "COMPLIANCE_CASE_OPENED",
                "compliance_case",
                complianceCase.getId(),
                Map.of(
                        "accountId", accountId.toString(),
                        "reason", reason
                )
        ));

        return complianceCase;
    }

    public ComplianceCase closeCase(List<String> roles, UUID actorUserId, UUID caseId) {
        permissionService.requirePermission(roles, CASE_WRITE_PERMISSION);

        ComplianceCase complianceCase = complianceCaseRepository.findById(caseId)
                .orElseThrow(() -> new ComplianceCaseNotFoundException(caseId));

        complianceCase.close(actorUserId);
        complianceCaseRepository.save(complianceCase);

        auditLogRepository.save(new AuditLog(
                actorUserId,
                "COMPLIANCE_CASE_CLOSED",
                "compliance_case",
                complianceCase.getId(),
                Map.of("accountId", complianceCase.getAccountId().toString())
        ));

        return complianceCase;
    }

    public List<ComplianceCase> listForAccount(List<String> roles, UUID accountId) {
        permissionService.requirePermission(roles, CASE_WRITE_PERMISSION);
        return complianceCaseRepository.findByAccountId(accountId);
    }
}
