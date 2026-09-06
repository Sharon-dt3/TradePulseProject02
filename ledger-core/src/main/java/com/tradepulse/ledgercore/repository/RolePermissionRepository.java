package com.tradepulse.ledgercore.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.RolePermission;

/**
 * existsByPermissionAndRoleIn backs PermissionService's Java-side mirror
 * of Postgres's authorize() function (V6): does any role in this list
 * have the requested permission?
 */
public interface RolePermissionRepository
        extends JpaRepository<RolePermission, RolePermission.RolePermissionId> {

    boolean existsByPermissionAndRoleIn(String permission, List<String> roles);
}
