package com.tradepulse.ledgercore.web;

import java.util.UUID;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.tradepulse.ledgercore.service.StatementService;
import com.tradepulse.ledgercore.service.StatementService.GeneratedStatement;
import com.tradepulse.ledgercore.web.dto.GenerateStatementRequestDto;

import jakarta.validation.Valid;

/**
 * Handles authenticated generation and immediate download of account statements.
 */
@RestController
public class StatementController {

    private final StatementService statementService;

    public StatementController(StatementService statementService) {
        this.statementService = statementService;
    }

    // PUBLIC_INTERFACE
    /**
     * Generates an account-owner's PDF statement for the supplied inclusive dates.
     *
     * @param accountId the account identified by the URL
     * @param request the inclusive start and end dates to include
     * @param authentication the authenticated Supabase principal
     * @return a PDF attachment containing every matching trade in the selected period
     */
    @PostMapping(value = "/accounts/{accountId}/statements", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generateStatement(
            @PathVariable UUID accountId,
            @Valid @RequestBody GenerateStatementRequestDto request,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID requesterId = UUID.fromString(jwt.getSubject());
        GeneratedStatement statement = statementService.generateAndStore(
                accountId,
                requesterId,
                request.periodStart(),
                request.periodEnd());

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(statement.filename()).build().toString())
                .body(statement.pdfBytes());
    }
}
