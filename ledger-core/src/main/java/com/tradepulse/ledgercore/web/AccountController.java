package com.tradepulse.ledgercore.web;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.service.AccountFreezeService;
import com.tradepulse.ledgercore.service.AccountService;
import com.tradepulse.ledgercore.web.dto.AccountResponse;
import com.tradepulse.ledgercore.web.dto.AccountSummaryDto;
import com.tradepulse.ledgercore.web.dto.FreezeAccountRequestDto;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Routing and request/response translation only — no business logic.
 * The ownership rule itself lives in AccountService; the freeze/unfreeze
 * rule (Phase 14 item 1) lives in AccountFreezeService.
 */
@RestController
public class AccountController {

    private final AccountService accountService;
    private final AccountFreezeService accountFreezeService;

    public AccountController(AccountService accountService, AccountFreezeService accountFreezeService) {
        this.accountService = accountService;
        this.accountFreezeService = accountFreezeService;
    }

    @GetMapping("/accounts")
    public ResponseEntity<List<AccountSummaryDto>> listAllAccounts(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        List<String> roles = jwt.getClaimAsStringList("user_role");

        return ResponseEntity.ok(accountService.listAllAccounts(roles));
    }

    @GetMapping("/accounts/me")
    public ResponseEntity<AccountResponse> getMyAccount(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID userId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        return accountService.getMyAccount(roles, userId)
                .map(AccountResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<AccountResponse> getAccount(
            @PathVariable UUID accountId, Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID callerId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        Account account = accountService.getAccount(roles, callerId, accountId);
        return ResponseEntity.ok(AccountResponse.from(account));
    }

    @PostMapping("/accounts/{accountId}/freeze")
    public ResponseEntity<AccountResponse> freezeAccount(
            @PathVariable UUID accountId,
            @Valid @RequestBody FreezeAccountRequestDto request,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        Account account = accountFreezeService.freeze(roles, actorUserId, accountId, request.reason());
        return ResponseEntity.ok(AccountResponse.from(account));
    }

    @PostMapping("/accounts/{accountId}/unfreeze")
    public ResponseEntity<AccountResponse> unfreezeAccount(
            @PathVariable UUID accountId,
            @Valid @RequestBody FreezeAccountRequestDto request,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID actorUserId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        Account account = accountFreezeService.unfreeze(roles, actorUserId, accountId, request.reason());
        return ResponseEntity.ok(AccountResponse.from(account));
    }
}
