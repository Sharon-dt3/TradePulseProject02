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

    /**
     * Phase 10: the service-layer half of dual control. The database's
     * ledger_adjustments_dual_control CHECK is the real enforcement -
     * this exists only so a caller who tries to approve their own
     * proposal gets a clean 403 instead of a raw constraint-violation
     * 500.
     */
    public static ForbiddenException selfApprovalNotAllowed() {
        return new ForbiddenException("A ledger adjustment cannot be approved by the same user who proposed it");
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
