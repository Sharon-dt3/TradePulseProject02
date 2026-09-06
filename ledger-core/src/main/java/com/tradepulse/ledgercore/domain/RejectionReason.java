package com.tradepulse.ledgercore.domain;

/**
 * Why a validly-submitted order was rejected rather than filled. This is
 * deliberately separate from ApiException/ApiError: those cover requests
 * that couldn't be processed at all (bad input, unknown account, an
 * idempotency conflict) and come back as a 4xx with the {code, message}
 * shape. A RejectionReason instead describes a request that WAS
 * processed successfully and simply resulted in a rejected order — the
 * HTTP response is still 201, with this value inside OrderResultDto.
 *
 * Persisted on Order.rejectionReason (V12__orders_rejection_reason.sql) —
 * originally this was response-only (see V11's comment), but
 * OrderService.listOrders needs to reconstruct a past rejection without
 * re-deriving it from audit_log's jsonb details, so it lives in the
 * domain package now rather than web.dto, and Order stores it directly.
 *
 * Per BLUEPRINT.md §7 OD-2, "TradeResult.rejection_reason" (this type)
 * is NOT declared frozen-v1 yet — that decision is still open, so Phase
 * 4 (INSUFFICIENT_POSITION, notional-limit) can add values here without
 * a version bump. This is also why the DB column has no CHECK constraint
 * enumerating values (see V12) - a CHECK would effectively freeze it at
 * the database layer while OD-2 is still open. Revisit this comment once
 * OD-2 is resolved.
 */
public enum RejectionReason {
    /** No tick has ever been observed for this symbol. */
    NO_MARKET,
    /** A tick exists for this symbol, but it's older than ledger.max-price-age-ms. */
    STALE_PRICE
}