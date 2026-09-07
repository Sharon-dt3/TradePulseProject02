package com.tradepulse.ledgercore.web;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tradepulse.ledgercore.service.LedgerTransactionService;
import com.tradepulse.ledgercore.web.dto.TransactionDto;

@RestController
public class LedgerTransactionController {

    private final LedgerTransactionService ledgerTransactionService;

    public LedgerTransactionController(LedgerTransactionService ledgerTransactionService) {
        this.ledgerTransactionService = ledgerTransactionService;
    }

    @GetMapping("/ledger/transactions")
    public ResponseEntity<List<TransactionDto>> listTransactions(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID userId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        return ResponseEntity.ok(ledgerTransactionService.listTransactions(roles, userId));
    }
}
