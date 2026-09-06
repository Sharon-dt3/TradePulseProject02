package com.tradepulse.ledgercore.exception;

import org.springframework.http.HttpStatus;

/**
 * Base type for the platform-wide {code, message} error shape (see
 * ApiError and GlobalExceptionHandler). Lives outside the web package
 * since it gets thrown from the service layer, not just controllers -
 * GlobalExceptionHandler is what translates it into an HTTP response.
 */
public abstract class ApiException extends RuntimeException {

    protected ApiException(String message) {
        super(message);
    }

    public abstract String getCode();

    public abstract HttpStatus getStatus();
}
