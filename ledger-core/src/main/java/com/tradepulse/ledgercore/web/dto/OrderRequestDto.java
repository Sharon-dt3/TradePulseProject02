package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import com.tradepulse.ledgercore.domain.Order;
import com.tradepulse.ledgercore.domain.Trade;

/**
 * Request body for POST /orders. There is deliberately no account_id
 * field — per BLUEPRINT.md §4's ownership-scoping rule, the account is
 * always derived from the caller's jwt.sub (see OrderController), never
 * trusted from the client.
 *
 * requestId (Phase 5) is a client-generated UUID identifying one logical
 * order attempt — the client is responsible for generating a fresh one
 * per distinct order and reusing the same one only when retrying an
 * attempt that may or may not have succeeded. See
 * OrderServiceImpl.placeOrder and the request-hashing utility for how
 * it's used to detect and safely replay a duplicate submission.
 *
 * limitPrice/expiresAt (Phase 8) are both optional at the annotation
 * level — @Positive and @Future both pass on null per the Bean Validation
 * spec — because their real requirement (limitPrice mandatory if and only
 * if orderType is LIMIT) is a relationship between two fields that no
 * single-field annotation can express. OrderServiceImpl enforces that
 * pairing explicitly and throws InvalidOrderRequestException if it's
 * violated. expiresAt being absent is valid for a LIMIT order too — it
 * just means the server picks a default TTL (see
 * ledger.limit-order-default-ttl-hours) rather than the client dictating
 * one.
 */
public record OrderRequestDto(
        @NotBlank String symbol,
        @NotNull Trade.Side side,
        @NotNull Order.OrderType orderType,
        @NotNull @Positive BigDecimal quantity,
        @NotNull UUID requestId,
        @Positive BigDecimal limitPrice,
        @Future OffsetDateTime expiresAt
) {
}
