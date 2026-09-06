package com.tradepulse.ledgercore.web;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.tradepulse.ledgercore.service.StatementService;
import com.tradepulse.ledgercore.web.dto.GenerateStatementRequestDto;

import jakarta.validation.Valid;

@RestController
public class StatementController {

    private final StatementService statementService;

    public StatementController(StatementService statementService) {
        this.statementService = statementService;
    }

    @PostMapping("/accounts/{accountId}/statements")
    public ResponseEntity<Map<String, String>> generateStatement(
            @PathVariable UUID accountId,
            @Valid @RequestBody GenerateStatementRequestDto request,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID requesterId = UUID.fromString(jwt.getSubject());

        String objectPath = statementService.generateAndStore(
                accountId, requesterId, request.periodStart(), request.periodEnd());

        return ResponseEntity.ok(Map.of("objectPath", objectPath));
    }
}
