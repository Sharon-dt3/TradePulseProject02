package com.tradepulse.ledgercore.exception;

import java.util.UUID;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a caller references an order id that doesn't exist, or that
 * exists but belongs to a different account. Both cases throw this same
 * exception with the same 404 - deliberately indistinguishable to the
 * caller, so this endpoint can never be used to learn that some other
 * account's order id exists (same reasoning as every other ownership-
 * scoped read/write in this codebase).
 */
public class OrderNotFoundException extends ApiException {

    private OrderNotFoundException(String message) {
        super(message);
    }

    public static OrderNotFoundException forId(UUID orderId) {
        return new OrderNotFoundException("No order found with id " + orderId);
    }

    @Override
    public String getCode() {
        return "ORDER_NOT_FOUND";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.NOT_FOUND;
    }
}
