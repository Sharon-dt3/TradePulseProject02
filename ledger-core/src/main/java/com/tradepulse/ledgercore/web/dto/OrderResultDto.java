package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.tradepulse.ledgercore.domain.Order;
import com.tradepulse.ledgercore.domain.Trade;

/**
 * Response body for POST /orders — for both outcomes. A REJECTED order
 * is a successful response (201): the request was valid, the order was
 * just rejected by a market/business rule, not thrown as an
 * ApiException. See RejectionReason's javadoc for that distinction.
 *
 * fillPrice/executedAt are populated only when status is FILLED;
 * rejectionReason only when status is REJECTED — never both at once,
 * enforced by construction (the two factories below are the only way to
 * build one of these).
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
    public static OrderResultDto filled(Order order, Trade trade) {
        return new OrderResultDto(
                order.getId(), order.getSymbol(), order.getSide(), order.getOrderType(),
                order.getQuantity(), order.getStatus(), null, trade.getPrice(), trade.getExecutedAt()
        );
    }

    public static OrderResultDto rejected(Order order, RejectionReason reason) {
        return new OrderResultDto(
                order.getId(), order.getSymbol(), order.getSide(), order.getOrderType(),
                order.getQuantity(), order.getStatus(), reason, null, null
        );
    }
}
