package com.tradepulse.ledgercore.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown by PermissionService.requirePermission when the caller's roles
 * (the JWT's "user_role" claim) don't grant the requested permission in
 * role_permissions.
 */
public class ForbiddenException extends ApiException {

    private ForbiddenException(String message) {
        super(message);
    }

    public static ForbiddenException missingPermission(String permission) {
        return new ForbiddenException("Missing required permission: " + permission);
    }

    @Override
    public String getCode() {
        return "FORBIDDEN";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.FORBIDDEN;
    }
}
