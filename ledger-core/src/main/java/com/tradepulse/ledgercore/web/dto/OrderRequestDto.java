package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;

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
 * orderType is typed as Order.OrderType rather than a plain String: that
 * enum currently only declares MARKET, so Jackson already rejects
 * anything else with a 400 during deserialization — no separate
 * "unsupported order type" check needed until Phase 8 adds LIMIT to the
 * enum.
 */
public record OrderRequestDto(
        @NotBlank String symbol,
        @NotNull Trade.Side side,
        @NotNull Order.OrderType orderType,
        @NotNull @Positive BigDecimal quantity
) {
}
