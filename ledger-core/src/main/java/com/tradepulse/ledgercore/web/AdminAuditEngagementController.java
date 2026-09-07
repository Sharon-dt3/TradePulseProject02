package com.tradepulse.ledgercore.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tradepulse.ledgercore.domain.AuditEngagement;
import com.tradepulse.ledgercore.service.AuditEngagementService;
import com.tradepulse.ledgercore.web.dto.AuditEngagementDto;
import com.tradepulse.ledgercore.web.dto.CreateAuditEngagementRequestDto;

/**
 * Phase 18 item 2: Admin creates audit_engagements - Auditor's
 * date-range access model. Routing only - AuditEngagementService holds
 * the permission checks and validation.
 */
@RestController
@RequestMapping("/admin/accounts/{accountId}/audit-engagements")
public class AdminAuditEngagementController {

    private final AuditEngagementService auditEngagementService;

    public AdminAuditEngagementController(AuditEngagementService auditEngagementService) {
        this.auditEngagementService = auditEngagementService;
    }

    @PostMapping
    public ResponseEntity<AuditEngagementDto> createEngagement(
            @PathVariable UUID accountId,
            @Valid @RequestBody CreateAuditEngagementRequestDto request,
            Authentication authentication) {
        List<String> roles = rolesOf(authentication);
        AuditEngagement engagement = auditEngagementService.createEngagement(
                roles, accountId, request.auditorUserId(), request.reason(),
                request.scopeStartDate(), request.scopeEndDate());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(engagement));
    }

    private AuditEngagementDto toDto(AuditEngagement engagement) {
        return new AuditEngagementDto(
                engagement.getId(), engagement.getAccountId(), engagement.getAuditorUserId(),
                engagement.getReason(), engagement.getScopeStartDate(), engagement.getScopeEndDate(),
                engagement.getCreatedAt());
    }

    private List<String> rolesOf(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return jwt.getClaimAsStringList("user_role");
    }
}
