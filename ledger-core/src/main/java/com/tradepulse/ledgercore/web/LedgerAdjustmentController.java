package com.tradepulse.ledgercore.web;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.tradepulse.ledgercore.domain.LedgerAdjustment;
import com.tradepulse.ledgercore.service.LedgerAdjustmentService;
import com.tradepulse.ledgercore.web.dto.LedgerAdjustmentDto;
import com.tradepulse.ledgercore.web.dto.ProposeAdjustmentRequestDto;

/**
 * Routing and request/response translation only - same split as
 * ComplianceCaseController. Permission enforcement
 * (ledger.adjustment.propose / ledger.adjustment.approve) and the
 * self-approval check happen inside LedgerAdjustmentService, not here.
 */
@RestController
public class LedgerAdjustmentController {

    private final LedgerAdjustmentService ledgerAdjustmentService;

    public LedgerAdjustmentController(LedgerAdjustmentService ledgerAdjustmentService) {
        this.ledgerAdjustmentService = ledgerAdjustmentService;
    }

    @PostMapping("/ledger/adjustments")
    public ResponseEntity<LedgerAdjustmentDto> propose(
            @Valid @RequestBody ProposeAdjustmentRequestDto request,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        LedgerAdjustment adjustment = ledgerAdjustmentService.proposeAdjustment(
                request.accountId(), actorUserId, roles, request.amount(), request.reason());
        return ResponseEntity.status(HttpStatus.CREATED).body(LedgerAdjustmentDto.from(adjustment));
    }

    @PostMapping("/ledger/adjustments/{adjustmentId}/approve")
    public ResponseEntity<LedgerAdjustmentDto> approve(
            @PathVariable UUID adjustmentId,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        LedgerAdjustment adjustment = ledgerAdjustmentService.approveAdjustment(adjustmentId, actorUserId, roles);
        return ResponseEntity.ok(LedgerAdjustmentDto.from(adjustment));
    }
}
