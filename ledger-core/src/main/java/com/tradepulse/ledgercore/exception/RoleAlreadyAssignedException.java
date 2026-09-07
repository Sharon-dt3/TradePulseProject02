package com.tradepulse.ledgercore.exception;

import java.util.UUID;

import org.springframework.http.HttpStatus;

public class RoleAlreadyAssignedException extends ApiException {

    private RoleAlreadyAssignedException(String message) {
        super(message);
    }

    public static RoleAlreadyAssignedException forUserAndRole(UUID userId, String role) {
        return new RoleAlreadyAssignedException("User " + userId + " already has role " + role);
    }

    @Override
    public String getCode() {
        return "ROLE_ALREADY_ASSIGNED";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.CONFLICT;
    }
}
