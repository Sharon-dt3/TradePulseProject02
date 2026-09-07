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
 * Phase 18 item 3: Admin audit read - the 200 most recent audit_log
 * rows, optionally narrowed to one entityType (e.g. "LEDGER_ADJUSTMENT",
 * "COMPLIANCE_CASE"). Routing only - AuditReadService holds the
 * permission check.
 */
@RestController
@RequestMapping("/admin/audit-log")
public class AdminAuditLogController {

    private final AuditReadService auditReadService;

    public AdminAuditLogController(AuditReadService auditReadService) {
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
