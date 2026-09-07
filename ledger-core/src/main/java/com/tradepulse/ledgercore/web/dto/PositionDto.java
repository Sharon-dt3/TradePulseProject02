package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;

import com.tradepulse.ledgercore.repository.TradeRepository;

/**
 * One symbol's net position for an account - BUY quantity minus SELL
 * quantity, same signed-sum logic as TradeRepository.currentPosition,
 * but across every symbol at once (see currentPositionsByAccount) rather
 * than one symbol looked up at a time the way ComplianceRules needs it.
 */
public record PositionDto(String symbol, BigDecimal quantity) {
    public static PositionDto from(TradeRepository.SymbolPosition position) {
        return new PositionDto(position.getSymbol(), position.getQuantity());
    }
}
