package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.tradepulse.ledgercore.domain.Order;
import com.tradepulse.ledgercore.domain.RejectionReason;
import com.tradepulse.ledgercore.domain.Trade;

/**
 * Response body for both POST /orders (a single order just placed) and
 * GET /orders (a list of past orders) — the same shape works for both,
 * since Order now carries its own rejectionReason (see
 * V12__orders_rejection_reason.sql) rather than that being something
 * only the placing request ever knew.
 *
 * A REJECTED order is a successful response (201/200): the request was
 * valid, the order was just rejected by a market/business rule, not
 * thrown as an ApiException. See RejectionReason's javadoc for that
 * distinction.
 *
 * fillPrice/executedAt come from the order's Trade and are null unless
 * status is FILLED; rejectionReason is null unless status is REJECTED —
 * from(order, trade) is the only way to build one of these, so those
 * two states can't both be populated at once by construction.
 */
public record OrderResultDto(
        UUID orderId,
        String symbol,
        Trade.Side side,
        Order.OrderType orderType,
        BigDecimal quantity,
        Order.Status status,
        RejectionReason rejectionReason,
        BigDecimal fillPrice,
        OffsetDateTime executedAt
) {
    /**
     * @param trade the order's fill, or null if it has none (rejected,
     *              or not yet resolved — the latter doesn't happen in
     *              v1, but nothing here assumes otherwise)
     */
    public static OrderResultDto from(Order order, Trade trade) {
        return new OrderResultDto(
                order.getId(), order.getSymbol(), order.getSide(), order.getOrderType(),
                order.getQuantity(), order.getStatus(), order.getRejectionReason(),
                trade == null ? null : trade.getPrice(),
                trade == null ? null : trade.getExecutedAt()
        );
    }
}