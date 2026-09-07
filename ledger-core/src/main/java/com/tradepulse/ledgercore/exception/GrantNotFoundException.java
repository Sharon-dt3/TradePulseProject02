package com.tradepulse.ledgercore.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when revoking (DELETE /admin/grants/{grantId}) an
 * account_grants row that doesn't exist for the given id.
 */
public class GrantNotFoundException extends ApiException {

    private GrantNotFoundException(String message) {
        super(message);
    }

    public static GrantNotFoundException forId(Long grantId) {
        return new GrantNotFoundException("No account grant found with id " + grantId);
    }

    @Override
    public String getCode() {
        return "GRANT_NOT_FOUND";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.NOT_FOUND;
    }
}
