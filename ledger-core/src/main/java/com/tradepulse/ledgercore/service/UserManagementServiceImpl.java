package com.tradepulse.ledgercore.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tradepulse.ledgercore.domain.AuthUser;
import com.tradepulse.ledgercore.domain.UserRole;
import com.tradepulse.ledgercore.exception.InvalidRoleException;
import com.tradepulse.ledgercore.exception.RoleAlreadyAssignedException;
import com.tradepulse.ledgercore.exception.RoleNotAssignedException;
import com.tradepulse.ledgercore.repository.AuthUserRepository;
import com.tradepulse.ledgercore.repository.UserRoleRepository;
import com.tradepulse.ledgercore.web.dto.UserSummaryDto;

@Service
public class UserManagementServiceImpl implements UserManagementService {

    private static final String USER_READ_PERMISSION = "user.read.all";
    private static final String ROLE_MANAGE_PERMISSION = "role.manage";

    // Mirrors the CHECK constraint on user_roles.role (V2) - validated here
    // too so a bad role name is a clean 400, not a raw constraint violation
    // surfacing from the database.
    private static final Set<String> VALID_ROLES = Set.of(
            "trader", "viewer", "delegated_viewer", "compliance",
            "risk_manager", "admin", "support", "auditor");

    private final AuthUserRepository authUserRepository;
    private final UserRoleRepository userRoleRepository;
    private final PermissionService permissionService;

    public UserManagementServiceImpl(
            AuthUserRepository authUserRepository,
            UserRoleRepository userRoleRepository,
            PermissionService permissionService) {
        this.authUserRepository = authUserRepository;
        this.userRoleRepository = userRoleRepository;
        this.permissionService = permissionService;
    }

    @Override
    public List<UserSummaryDto> listUsers(List<String> callerRoles) {
        permissionService.requirePermission(callerRoles, USER_READ_PERMISSION);

        Map<UUID, List<String>> rolesByUserId = userRoleRepository.findAllByOrderByUserId().stream()
                .collect(Collectors.groupingBy(
                        UserRole::getUserId,
                        Collectors.mapping(UserRole::getRole, Collectors.toList())));

        return authUserRepository.findAllByOrderByEmailAsc().stream()
                .map(user -> new UserSummaryDto(
                        user.getId(), user.getEmail(), rolesByUserId.getOrDefault(user.getId(), List.of())))
                .toList();
    }

    @Override
    public void assignRole(List<String> callerRoles, UUID targetUserId, String role) {
        permissionService.requirePermission(callerRoles, ROLE_MANAGE_PERMISSION);

        if (!VALID_ROLES.contains(role)) {
            throw InvalidRoleException.forRole(role);
        }
        if (userRoleRepository.existsByUserIdAndRole(targetUserId, role)) {
            throw RoleAlreadyAssignedException.forUserAndRole(targetUserId, role);
        }
        userRoleRepository.save(new UserRole(targetUserId, role));
    }

    @Override
    @Transactional
    public void removeRole(List<String> callerRoles, UUID targetUserId, String role) {
        permissionService.requirePermission(callerRoles, ROLE_MANAGE_PERMISSION);

        if (!userRoleRepository.existsByUserIdAndRole(targetUserId, role)) {
            throw RoleNotAssignedException.forUserAndRole(targetUserId, role);
        }
        userRoleRepository.deleteByUserIdAndRole(targetUserId, role);
    }
}
