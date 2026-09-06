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
 * Per BLUEPRINT.md §7 OD-2 (resolved: left open until v1 ships),
 * "TradeResult.rejection_reason" (this type) is NOT frozen-v1 — new
 * values can be added here without a version bump, which is exactly what
 * Phase 4's two values and Phase 9's ACCOUNT_FROZEN are. This is also why
 * the DB column has no CHECK constraint enumerating values (see V12) — a
 * CHECK would effectively freeze it at the database layer while OD-2 was
 * still open.
 */
public enum RejectionReason {
    /** No tick has ever been observed for this symbol. */
    NO_MARKET,
    /** A tick exists for this symbol, but it's older than ledger.max-price-age-ms. */
    STALE_PRICE,
    /**
     * A SELL would take a non-margin account's position below zero.
     * Margin-enabled accounts (accounts.margin_enabled = true) are exempt
     * from this check — Phase 4 only enforces long-only for accounts that
     * haven't opted into margin; margin trading itself isn't built yet
     * (deferred to Phase 11).
     */
    INSUFFICIENT_POSITION,
    /**
     * The account's notional exposure in this symbol after the order
     * fills (|positionAfter| x referencePrice) would exceed
     * ledger.max-position-notional. Deliberately notional, not share
     * count — see ComplianceRules' javadoc for why.
     */
    NOTIONAL_LIMIT_EXCEEDED,
    /**
     * accounts.frozen = true for this order's account. Checked once in
     * OrderServiceImpl.resolveOrder before either order-type branch runs
     * — freezing blocks every new order regardless of MARKET/LIMIT.
     */
    ACCOUNT_FROZEN
}
