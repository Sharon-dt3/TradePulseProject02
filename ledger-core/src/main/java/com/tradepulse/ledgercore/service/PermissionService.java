package com.tradepulse.ledgercore.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.tradepulse.ledgercore.exception.ForbiddenException;
import com.tradepulse.ledgercore.repository.RolePermissionRepository;

/**
 * Java-side mirror of the Postgres authorize() function (V6): does any
 * role this user holds (the "user_role" JWT claim, injected by the claim
 * hook in V4/V5) have the requested permission in role_permissions? Same
 * table, same semantics, no implicit admin bypass — just evaluated here
 * because ledger-core's own JDBC connection runs as postgres and never
 * goes through PostgREST/RLS, so Postgres's authorize() is never called
 * on ledger-core's own writes (see V7/V9 comments on why FORCE ROW LEVEL
 * SECURITY is deliberately absent).
 */
@Service
public class PermissionService {

    private final RolePermissionRepository rolePermissionRepository;

    public PermissionService(RolePermissionRepository rolePermissionRepository) {
        this.rolePermissionRepository = rolePermissionRepository;
    }

    public boolean hasPermission(List<String> roles, String permission) {
        if (roles == null || roles.isEmpty()) {
            return false;
        }
        return rolePermissionRepository.existsByPermissionAndRoleIn(permission, roles);
    }

    public void requirePermission(List<String> roles, String permission) {
        if (!hasPermission(roles, permission)) {
            throw ForbiddenException.missingPermission(permission);
        }
    }
}
