package com.tradepulse.ledgercore.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.tradepulse.ledgercore.exception.ApiException;
import com.tradepulse.ledgercore.web.dto.ApiError;

/**
 * Translates any thrown ApiException into the platform-wide {code,
 * message} error shape, at the correct HTTP status. This is the one
 * place that translation happens - controllers just throw a specific
 * ApiException subclass and never build an error ResponseEntity by hand.
 * Does not apply to pre-existing endpoints that don't throw ApiException
 * (e.g. AccountController's bare 404) - see ApiError's javadoc.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApiException(ApiException ex) {
        return ResponseEntity
                .status(ex.getStatus())
                .body(new ApiError(ex.getCode(), ex.getMessage()));
    }
}
