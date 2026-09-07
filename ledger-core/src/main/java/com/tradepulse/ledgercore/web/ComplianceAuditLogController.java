package com.tradepulse.ledgercore.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.service.AuditReadService;
import com.tradepulse.ledgercore.web.dto.AuditLogEntryDto;

/**
 * Phase 14 item 5: Compliance audit-history read. This is a role-neutral
 * URL alias, not new authorization logic - compliance already holds
 * audit.read.any (seeded in V3, alongside admin and auditor), so
 * AuditReadService.listAuditLog already accepted a compliance caller
 * before this controller existed; a compliance user just had no
 * endpoint of their own to call and had to know to hit /admin/audit-log
 * instead. This purely corrects that naming mismatch by exposing the
 * identical read path (same AuditReadService, same 200-row cap, same
 * optional entityType filter) under a path that doesn't imply
 * admin-only. The plan's originally-proposed audit.read.compliance
 * permission was deliberately not introduced - see AuditReadService's
 * javadoc for why a second, narrower permission was left for a future
 * phase rather than built here.
 */
@RestController
@RequestMapping("/compliance/audit-log")
public class ComplianceAuditLogController {

    private final AuditReadService auditReadService;

    public ComplianceAuditLogController(AuditReadService auditReadService) {
        this.auditReadService = auditReadService;
    }

    @GetMapping
    public ResponseEntity<List<AuditLogEntryDto>> listAuditLog(
            @RequestParam(required = false) String entityType, Authentication authentication) {
        List<String> roles = rolesOf(authentication);
        List<AuditLogEntryDto> entries = auditReadService.listAuditLog(roles, entityType).stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(entries);
    }

    private AuditLogEntryDto toDto(AuditLog log) {
        return new AuditLogEntryDto(
                log.getId(), log.getActorUserId(), log.getAction(), log.getEntityType(),
                log.getEntityId(), log.getDetails(), log.getCreatedAt());
    }

    private List<String> rolesOf(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return jwt.getClaimAsStringList("user_role");
    }
}
