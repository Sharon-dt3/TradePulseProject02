package com.tradepulse.ledgercore.exception;

import java.util.UUID;

import org.springframework.http.HttpStatus;

import com.tradepulse.ledgercore.domain.Order;

/**
 * Thrown when a cancel request targets an order that isn't WORKING -
 * already FILLED/REJECTED/CANCELLED/EXPIRED, or (in practice never
 * client-visible, see Order.cancel()'s javadoc) still NEW. 409 CONFLICT:
 * the request is well-formed, but the order's current state doesn't allow
 * it, same reasoning as IdempotencyKeyReusedException.
 */
public class OrderNotCancellableException extends ApiException {

    private OrderNotCancellableException(String message) {
        super(message);
    }

    public static OrderNotCancellableException forStatus(UUID orderId, Order.Status status) {
        return new OrderNotCancellableException(
                "Order " + orderId + " cannot be cancelled - status is " + status);
    }

    @Override
    public String getCode() {
        return "ORDER_NOT_CANCELLABLE";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.CONFLICT;
    }
}
