package com.tradepulse.ledgercore.web;

import com.tradepulse.ledgercore.service.AccountService;
import com.tradepulse.ledgercore.web.dto.AccountResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Routing and request/response translation only — no business logic.
 * The ownership rule itself lives in AccountService.
 */
@RestController
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping("/accounts/me")
    public ResponseEntity<AccountResponse> getMyAccount(
            org.springframework.security.core.Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID userId = UUID.fromString(jwt.getSubject());

        return accountService.getAccountForUser(userId)
                .map(AccountResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}