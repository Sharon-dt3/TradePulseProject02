package com.tradepulse.ledgercore.exception;

import java.util.UUID;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an admin operation references a user id that doesn't
 * exist in auth.users - e.g. a grantedToUserId or auditorUserId the
 * client supplied that isn't a real user. Checked explicitly before
 * insert so a bad id is a clean 404 rather than a raw foreign-key
 * violation surfacing from the database.
 */
public class UserNotFoundException extends ApiException {

    private UserNotFoundException(String message) {
        super(message);
    }

    public static UserNotFoundException forUserId(UUID userId) {
        return new UserNotFoundException("No user found with id " + userId);
    }

    @Override
    public String getCode() {
        return "USER_NOT_FOUND";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.NOT_FOUND;
    }
}
