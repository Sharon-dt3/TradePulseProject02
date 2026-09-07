package com.tradepulse.ledgercore.exception;

import java.util.UUID;

import org.springframework.http.HttpStatus;

public class RoleNotAssignedException extends ApiException {

    private RoleNotAssignedException(String message) {
        super(message);
    }

    public static RoleNotAssignedException forUserAndRole(UUID userId, String role) {
        return new RoleNotAssignedException("User " + userId + " does not have role " + role);
    }

    @Override
    public String getCode() {
        return "ROLE_NOT_ASSIGNED";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.NOT_FOUND;
    }
}
