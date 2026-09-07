package com.tradepulse.ledgercore.service;

import java.util.List;
import java.util.UUID;

import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.web.dto.PositionDto;
import com.tradepulse.ledgercore.web.dto.TradeResultDto;

/**
 * Direct, own-account reads of positions and trades - Phase 12's
 * "a trader can fully self-serve without a manual SQL query" checklist
 * item. Positions have no dedicated table (see TradeRepository's javadoc
 * on currentPosition): both reads here are derived straight from the
 * trades table, the same source of truth ComplianceRules already relies
 * on for the single-symbol case.
 */
public interface PortfolioService {

    /**
     * Every symbol this account currently holds a nonzero position in,
     * netted from BUY/SELL trades. A symbol that's been fully closed out
     * (net zero) is omitted, not returned as a zero-quantity row.
     *
     * @throws AccountNotFoundException if userId has no account
     */
    List<PositionDto> listPositions(List<String> roles, UUID userId);

    /**
     * Every trade the caller's account has ever had, newest first -
     * unlike OrderService.listOrders, this is trades directly (fills
     * only), not orders-with-their-trade-attached.
     *
     * @throws AccountNotFoundException if userId has no account
     */
    List<TradeResultDto> listTrades(List<String> roles, UUID userId);
}
