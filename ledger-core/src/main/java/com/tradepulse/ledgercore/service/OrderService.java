package com.tradepulse.ledgercore.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.exception.OrderNotCancellableException;
import com.tradepulse.ledgercore.exception.OrderNotFoundException;
import com.tradepulse.ledgercore.web.dto.OrderRequestDto;
import com.tradepulse.ledgercore.web.dto.OrderResultDto;

/**
 * Order placement and lifecycle. MARKET orders fill immediately at the
 * cached tick price, or reject NO_MARKET/STALE_PRICE. LIMIT orders
 * (Phase 8) fill immediately too if they already cross at placement,
 * otherwise sit WORKING until handleTick or the expiry sweep resolves
 * them. Mirrors AccountService's shape for placeOrder/listOrders — the
 * controller passes in the caller's userId, not an account_id, so
 * ownership resolution (jwt.sub -> account) stays behind this one seam
 * rather than trusting a client-supplied account.
 */
public interface OrderService {

    /**
     * @param roles   the caller's roles (jwt "user_role" claim), checked
     *                against {@code orders.create} before anything else
     * @param userId  the caller, taken from jwt.sub — this is also who
     *                owns the account the order is placed against, since
     *                Phase 3 has no delegated-trading concept yet.
     * @throws AccountNotFoundException if userId has no account
     */
    OrderResultDto placeOrder(List<String> roles, UUID userId, OrderRequestDto request);

    /**
     * Every order the caller's account has ever placed, newest first.
     *
     * @param roles the caller's roles (jwt "user_role" claim), checked
     *              against {@code orders.read.own} before anything else
     * @throws AccountNotFoundException if userId has no account
     */
    List<OrderResultDto> listOrders(List<String> roles, UUID userId);

    /**
     * Called once per tick (by MarketTickConsumer, after it updates
     * PriceCache) for every WORKING LIMIT order on this symbol that now
     * crosses tickPrice: fills it at tickPrice through the same
     * compliance-then-fill path placement uses, or rejects it if a
     * compliance check that passed at placement no longer does (e.g. the
     * account's position moved since then). Has no caller-facing result —
     * a tick isn't a request anyone is waiting on a response for.
     */
    void handleTick(String symbol, BigDecimal tickPrice);

    /**
     * Cancels a WORKING order the caller's account owns.
     *
     * @param roles   the caller's roles (jwt "user_role" claim), checked
     *                against {@code orders.cancel.own} before anything else
     * @param userId  the caller, taken from jwt.sub - resolved to an
     *                account the same way placeOrder/listOrders are, so a
     *                client can never cancel another account's order by
     *                guessing its id
     * @throws AccountNotFoundException     if userId has no account
     * @throws OrderNotFoundException       if orderId doesn't exist, or
     *                                       exists but belongs to a
     *                                       different account (the two
     *                                       cases are indistinguishable to
     *                                       the caller on purpose)
     * @throws OrderNotCancellableException if the order isn't WORKING
     */
    OrderResultDto cancelOrder(List<String> roles, UUID userId, UUID orderId);
}
