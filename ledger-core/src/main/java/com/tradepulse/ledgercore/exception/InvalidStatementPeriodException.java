package com.tradepulse.ledgercore.exception;

import org.springframework.http.HttpStatus;

/**
 * Indicates that a requested account-statement date range is invalid.
 */
public class InvalidStatementPeriodException extends ApiException {

    private InvalidStatementPeriodException(String message) {
        super(message);
    }

    // PUBLIC_INTERFACE
    /**
     * Creates the validation error returned when a statement ends before it starts.
     *
     * @return an exception that maps to HTTP 400 Bad Request
     */
    public static InvalidStatementPeriodException endBeforeStart() {
        return new InvalidStatementPeriodException(
                "Statement period end must be on or after the period start");
    }

    @Override
    public String getCode() {
        return "INVALID_STATEMENT_PERIOD";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.BAD_REQUEST;
    }
}
