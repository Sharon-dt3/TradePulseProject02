package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.tradepulse.ledgercore.domain.Trade;

/**
 * Response body for GET /trades - every fill directly, unlike
 * OrderResultDto which represents an order (with its trade, if any,
 * folded in).
 */
public record TradeResultDto(
        UUID tradeId,
        UUID orderId,
        String symbol,
        Trade.Side side,
        BigDecimal quantity,
        BigDecimal price,
        OffsetDateTime executedAt
) {
    public static TradeResultDto from(Trade trade) {
        return new TradeResultDto(
                trade.getId(), trade.getOrderId(), trade.getSymbol(), trade.getSide(),
                trade.getQuantity(), trade.getPrice(), trade.getExecutedAt()
        );
    }
}
