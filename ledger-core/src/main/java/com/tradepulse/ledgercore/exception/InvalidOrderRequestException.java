package com.tradepulse.ledgercore.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown for a structurally-valid-per-annotation but semantically invalid
 * POST /orders request — specifically the LIMIT/limitPrice pairing that
 * jakarta.validation's field-level annotations can't express on their own
 * (it's a relationship between two fields, not a constraint on either one
 * alone). 400 BAD_REQUEST: the request itself is malformed, unlike
 * IdempotencyKeyReusedException's 409 (a well-formed request that
 * conflicts with an earlier one).
 */
public class InvalidOrderRequestException extends ApiException {

    private InvalidOrderRequestException(String message) {
        super(message);
    }

    public static InvalidOrderRequestException limitPriceRequired() {
        return new InvalidOrderRequestException("limitPrice is required when orderType is LIMIT");
    }

    public static InvalidOrderRequestException limitPriceNotAllowed() {
        return new InvalidOrderRequestException("limitPrice is only allowed when orderType is LIMIT");
    }

    @Override
    public String getCode() {
        return "INVALID_ORDER_REQUEST";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.BAD_REQUEST;
    }
}
