package com.tradepulse.ledgercore.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tradepulse.ledgercore.domain.AccountGrant;
import com.tradepulse.ledgercore.service.AccountGrantService;
import com.tradepulse.ledgercore.web.dto.AccountGrantDto;
import com.tradepulse.ledgercore.web.dto.CreateAccountGrantRequestDto;

/**
 * Phase 18 item 2: Admin issues and revokes account_grants for
 * Delegated Viewer and Support access. Routing only -
 * AccountGrantService holds the permission checks and validation.
 */
@RestController
@RequestMapping("/admin")
public class AdminAccountGrantController {

    private final AccountGrantService accountGrantService;

    public AdminAccountGrantController(AccountGrantService accountGrantService) {
        this.accountGrantService = accountGrantService;
    }

    @PostMapping("/accounts/{accountId}/grants")
    public ResponseEntity<AccountGrantDto> issueGrant(
            @PathVariable UUID accountId,
            @Valid @RequestBody CreateAccountGrantRequestDto request,
            Authentication authentication) {
        List<String> roles = rolesOf(authentication);
        AccountGrant grant = accountGrantService.issueGrant(
                roles, accountId, request.grantedToUserId(), request.purpose(),
                request.reason(), request.expiresAt());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(grant));
    }

    @DeleteMapping("/grants/{grantId}")
    public ResponseEntity<Void> revokeGrant(@PathVariable Long grantId, Authentication authentication) {
        List<String> roles = rolesOf(authentication);
        accountGrantService.revokeGrant(roles, grantId);
        return ResponseEntity.noContent().build();
    }

    private AccountGrantDto toDto(AccountGrant grant) {
        return new AccountGrantDto(
                grant.getId(), grant.getAccountId(), grant.getGrantedToUserId(), grant.getPurpose(),
                grant.getReason(), grant.getExpiresAt(), grant.getCreatedAt());
    }

    private List<String> rolesOf(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return jwt.getClaimAsStringList("user_role");
    }
}
