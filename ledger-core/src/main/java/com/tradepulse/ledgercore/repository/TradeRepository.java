package com.tradepulse.ledgercore.repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tradepulse.ledgercore.domain.Trade;

/**
 * Spring Data JPA generates the implementation at runtime. postTrade
 * only needs save(), which JpaRepository already provides.
 * findByOrderIdIn backs OrderServiceImpl.listOrders' one-query batch
 * fetch of fills for a page of orders, instead of one query per order.
 *
 * currentPosition backs Phase 4's ComplianceRules: there is no separate
 * positions table, so "how much of this symbol does this account
 * currently hold" is derived by summing every trade's signed quantity
 * (BUY = +quantity, SELL = -quantity) rather than maintained as running
 * state anywhere. COALESCE(..., 0) handles the common case of a symbol
 * never traded by this account, where the SUM would otherwise be NULL.
 */
public interface TradeRepository extends JpaRepository<Trade, UUID> {
    List<Trade> findByOrderIdIn(Collection<UUID> orderIds);

    @Query("""
            SELECT COALESCE(SUM(
                CASE WHEN t.side = com.tradepulse.ledgercore.domain.Trade$Side.BUY
                     THEN t.quantity
                     ELSE -t.quantity
                END
            ), 0)
            FROM Trade t
            WHERE t.accountId = :accountId AND t.symbol = :symbol
            """)
    BigDecimal currentPosition(@Param("accountId") UUID accountId, @Param("symbol") String symbol);
}