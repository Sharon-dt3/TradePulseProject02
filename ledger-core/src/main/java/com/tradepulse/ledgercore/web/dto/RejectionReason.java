package com.tradepulse.ledgercore.web.dto;

/**
 * Why a validly-submitted order was rejected rather than filled. This is
 * deliberately separate from ApiException/ApiError: those cover requests
 * that couldn't be processed at all (bad input, unknown account, an
 * idempotency conflict) and come back as a 4xx with the {code, message}
 * shape. A RejectionReason instead describes a request that WAS
 * processed successfully and simply resulted in a rejected order — the
 * HTTP response is still 201, with this value inside OrderResultDto.
 *
 * Per BLUEPRINT.md §7 OD-2, "TradeResult.rejection_reason" (this type)
 * is NOT declared frozen-v1 yet — that decision is still open, so Phase
 * 4 (INSUFFICIENT_POSITION, notional-limit) can add values here without
 * a version bump. Revisit this comment once OD-2 is resolved.
 */
public enum RejectionReason {
    /** No tick has ever been observed for this symbol. */
    NO_MARKET,
    /** A tick exists for this symbol, but it's older than ledger.max-price-age-ms. */
    STALE_PRICE
}
