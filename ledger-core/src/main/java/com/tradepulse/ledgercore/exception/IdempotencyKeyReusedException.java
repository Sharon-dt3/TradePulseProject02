package com.tradepulse.ledgercore.exception;

import java.util.UUID;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a POST /orders request reuses a requestId that already
 * belongs to a different order — same key, different fields. This is
 * the "you changed something under the same idempotency key" case,
 * distinct from a legitimate replay (same key, same hash), which returns
 * the cached result instead of throwing anything. 409 CONFLICT: the
 * request itself is well-formed, but it conflicts with a prior request
 * that used the same requestId.
 */
public class IdempotencyKeyReusedException extends ApiException {

    private IdempotencyKeyReusedException(String message) {
        super(message);
    }

    public static IdempotencyKeyReusedException forRequestId(UUID requestId) {
        return new IdempotencyKeyReusedException(
                "requestId " + requestId + " was already used with different order fields");
    }

    @Override
    public String getCode() {
        return "IDEMPOTENCY_KEY_REUSED";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.CONFLICT;
    }
}