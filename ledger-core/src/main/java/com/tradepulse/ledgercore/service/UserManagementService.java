package com.tradepulse.ledgercore.service;

import java.util.List;
import java.util.UUID;

import com.tradepulse.ledgercore.exception.InvalidRoleException;
import com.tradepulse.ledgercore.exception.RoleAlreadyAssignedException;
import com.tradepulse.ledgercore.exception.RoleNotAssignedException;
import com.tradepulse.ledgercore.web.dto.UserSummaryDto;

/**
 * Phase 18: replaces every manual "INSERT INTO user_roles" this whole
 * session has relied on with real, permission-checked API calls. Every
 * user in auth.users is listed (not just ones with a role yet), each
 * with whatever roles they currently hold - an empty roles list is a
 * legitimate, common state (a signed-up user before Admin grants
 * anything).
 */
public interface UserManagementService {

    /** @throws com.tradepulse.ledgercore.exception.ForbiddenException if the caller lacks user.read.all */
    List<UserSummaryDto> listUsers(List<String> callerRoles);

    /**
     * @throws InvalidRoleException          if role isn't one of the 8 valid roles
     * @throws RoleAlreadyAssignedException  if targetUserId already holds role
     */
    void assignRole(List<String> callerRoles, UUID targetUserId, String role);

    /** @throws RoleNotAssignedException if targetUserId doesn't hold role */
    void removeRole(List<String> callerRoles, UUID targetUserId, String role);
}
