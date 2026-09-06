package com.tradepulse.ledgercore.web.dto;

/**
 * Platform-wide error response shape, adopted from Phase 3 forward (see
 * IMPLEMENTATION_PLAN.md Phase 3 checklist). Rendered by
 * GlobalExceptionHandler for any thrown ApiException. Pre-existing
 * endpoints (e.g. AccountController's bare 404) are not retrofitted to
 * this shape - only new error paths from this phase on use it.
 */
public record ApiError(String code, String message) {
}
