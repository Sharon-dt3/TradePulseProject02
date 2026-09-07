package com.tradepulse.ledgercore.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown for a structurally-valid but semantically invalid POST
 * /admin/accounts/{accountId}/grants request - specifically a purpose
 * outside the {delegated_viewer, support} subset the admin API accepts.
 * account_grants' own CHECK constraint also allows 'auditor', but that
 * purpose is only ever created via the audit_engagements flow instead
 * (see AccountGrantService).
 */
public class InvalidGrantRequestException extends ApiException {

    private InvalidGrantRequestException(String message) {
        super(message);
    }

    public static InvalidGrantRequestException invalidPurpose(String purpose) {
        return new InvalidGrantRequestException(
                "purpose must be one of delegated_viewer, support (got: " + purpose + ")");
    }

    @Override
    public String getCode() {
        return "INVALID_GRANT_REQUEST";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.BAD_REQUEST;
    }
}
