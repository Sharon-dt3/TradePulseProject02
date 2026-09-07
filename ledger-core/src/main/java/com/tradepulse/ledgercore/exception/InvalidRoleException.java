package com.tradepulse.ledgercore.exception;

import org.springframework.http.HttpStatus;

public class InvalidRoleException extends ApiException {

    private InvalidRoleException(String message) {
        super(message);
    }

    public static InvalidRoleException forRole(String role) {
        return new InvalidRoleException("Not a valid role: " + role);
    }

    @Override
    public String getCode() {
        return "INVALID_ROLE";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.BAD_REQUEST;
    }
}
