package com.tradepulse.ledgercore.web;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.tradepulse.ledgercore.domain.ComplianceCase;
import com.tradepulse.ledgercore.service.ComplianceCaseService;
import com.tradepulse.ledgercore.web.dto.ComplianceCaseDto;
import com.tradepulse.ledgercore.web.dto.OpenComplianceCaseRequestDto;

/**
 * Routing and request/response translation only — no business logic,
 * same split as OrderController/AccountController. Permission
 * enforcement (compliance.case.write) happens inside
 * ComplianceCaseService, not here.
 */
@RestController
public class ComplianceCaseController {

    private final ComplianceCaseService complianceCaseService;

    public ComplianceCaseController(ComplianceCaseService complianceCaseService) {
        this.complianceCaseService = complianceCaseService;
    }

    @PostMapping("/compliance/cases")
    public ResponseEntity<ComplianceCaseDto> openCase(
            @Valid @RequestBody OpenComplianceCaseRequestDto request,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        ComplianceCase complianceCase = complianceCaseService.openCase(
                roles, actorUserId, request.accountId(), request.reason());
        return ResponseEntity.status(HttpStatus.CREATED).body(ComplianceCaseDto.from(complianceCase));
    }

    @PostMapping("/compliance/cases/{caseId}/close")
    public ResponseEntity<ComplianceCaseDto> closeCase(
            @PathVariable UUID caseId,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        ComplianceCase complianceCase = complianceCaseService.closeCase(roles, actorUserId, caseId);
        return ResponseEntity.ok(ComplianceCaseDto.from(complianceCase));
    }

    @GetMapping("/compliance/cases")
    public ResponseEntity<List<ComplianceCaseDto>> listForAccount(
            @RequestParam UUID accountId,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        List<String> roles = jwt.getClaimAsStringList("user_role");

        List<ComplianceCaseDto> results = complianceCaseService.listForAccount(roles, accountId)
                .stream()
                .map(ComplianceCaseDto::from)
                .toList();
        return ResponseEntity.ok(results);
    }
}
