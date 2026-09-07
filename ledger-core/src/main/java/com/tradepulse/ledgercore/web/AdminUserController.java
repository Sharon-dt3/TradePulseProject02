package com.tradepulse.ledgercore.web;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tradepulse.ledgercore.service.UserManagementService;
import com.tradepulse.ledgercore.web.dto.UserSummaryDto;

/**
 * Phase 18: user listing and role assignment/removal, replacing every
 * manual "INSERT INTO user_roles" this whole session has relied on so
 * far. Routing only - UserManagementServiceImpl holds the permission
 * checks and validation.
 */
@RestController
@RequestMapping("/admin/users")
public class AdminUserController {

    private final UserManagementService userManagementService;

    public AdminUserController(UserManagementService userManagementService) {
        this.userManagementService = userManagementService;
    }

    @GetMapping
    public ResponseEntity<List<UserSummaryDto>> listUsers(Authentication authentication) {
        List<String> roles = rolesOf(authentication);
        return ResponseEntity.ok(userManagementService.listUsers(roles));
    }

    @PostMapping("/{userId}/roles/{role}")
    public ResponseEntity<Void> assignRole(
            @PathVariable UUID userId, @PathVariable String role, Authentication authentication) {
        List<String> roles = rolesOf(authentication);
        userManagementService.assignRole(roles, userId, role);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{userId}/roles/{role}")
    public ResponseEntity<Void> removeRole(
            @PathVariable UUID userId, @PathVariable String role, Authentication authentication) {
        List<String> roles = rolesOf(authentication);
        userManagementService.removeRole(roles, userId, role);
        return ResponseEntity.noContent().build();
    }

    private List<String> rolesOf(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return jwt.getClaimAsStringList("user_role");
    }
}
