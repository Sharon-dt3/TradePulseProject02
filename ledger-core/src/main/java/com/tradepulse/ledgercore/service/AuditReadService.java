package com.tradepulse.ledgercore.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.repository.AuditLogRepository;

/**
 * Phase 18 item 3: Admin audit read. Reuses 'audit.read.any', already
 * seeded to admin (and compliance, auditor) back in V3 - no new
 * migration needed, just the read path those roles never had before.
 * "Broader than Compliance's own audit scope" (per the plan) will come
 * from a future, narrower Phase 14 permission
 * (audit.read.compliance) layered on top of this same table, not from
 * anything this class does differently - this class only ever serves
 * the unrestricted, all-entries view.
 */
@Service
public class AuditReadService {

    private static final String AUDIT_READ_PERMISSION = "audit.read.any";

    private final AuditLogRepository auditLogRepository;
    private final PermissionService permissionService;

    public AuditReadService(AuditLogRepository auditLogRepository, PermissionService permissionService) {
        this.auditLogRepository = auditLogRepository;
        this.permissionService = permissionService;
    }

    public List<AuditLog> listAuditLog(List<String> callerRoles, String entityType) {
        permissionService.requirePermission(callerRoles, AUDIT_READ_PERMISSION);

        if (entityType == null || entityType.isBlank()) {
            return auditLogRepository.findTop200ByOrderByCreatedAtDesc();
        }
        return auditLogRepository.findTop200ByEntityTypeOrderByCreatedAtDesc(entityType);
    }
}
