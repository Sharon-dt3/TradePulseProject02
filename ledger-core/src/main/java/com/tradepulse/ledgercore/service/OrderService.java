package com.tradepulse.ledgercore.service;

import java.util.UUID;

import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.web.dto.OrderRequestDto;
import com.tradepulse.ledgercore.web.dto.OrderResultDto;

/**
 * Order placement, scoped to Phase 3: MARKET orders filled immediately
 * at the cached tick price, or rejected NO_MARKET/STALE_PRICE. Mirrors
 * AccountService's shape — the controller passes in the caller's
 * userId, not an account_id, so ownership resolution (jwt.sub ->
 * account) stays behind this one seam rather than trusting a
 * client-supplied account.
 */
public interface OrderService {

    /**
     * @param userId  the caller, taken from jwt.sub — this is also who
     *                owns the account the order is placed against, since
     *                Phase 3 has no delegated-trading concept yet.
     * @throws AccountNotFoundException if userId has no account
     */
    OrderResultDto placeOrder(UUID userId, OrderRequestDto request);
}
