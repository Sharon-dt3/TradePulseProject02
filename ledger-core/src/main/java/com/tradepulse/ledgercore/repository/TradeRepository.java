package com.tradepulse.ledgercore.repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
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

    // Phase 9: backs StatementService's statement-period trade listing.
    // executedAt is stored per-trade (not the enclosing order), so this
    // filters directly on it rather than joining through orders.
    List<Trade> findByAccountIdAndExecutedAtBetweenOrderByExecutedAtAsc(
            UUID accountId, OffsetDateTime start, OffsetDateTime end);

    // Phase 12: backs GET /trades - every trade for an account, newest
    // first, no date filtering (unlike the statement-period query above).
    List<Trade> findByAccountIdOrderByExecutedAtDesc(UUID accountId);

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

    // Phase 12: backs GET /positions - the same signed-sum logic as
    // currentPosition above, but grouped across every symbol the account
    // has ever traded at once, instead of one symbol looked up at a time.
    // HAVING <> 0 drops a symbol the account has fully closed out, rather
    // than returning it as a zero-quantity row.
    @Query("""
            SELECT t.symbol AS symbol, COALESCE(SUM(
                CASE WHEN t.side = com.tradepulse.ledgercore.domain.Trade$Side.BUY
                     THEN t.quantity
                     ELSE -t.quantity
                END
            ), 0) AS quantity
            FROM Trade t
            WHERE t.accountId = :accountId
            GROUP BY t.symbol
            HAVING COALESCE(SUM(
                CASE WHEN t.side = com.tradepulse.ledgercore.domain.Trade$Side.BUY
                     THEN t.quantity
                     ELSE -t.quantity
                END
            ), 0) <> 0
            """)
    List<SymbolPosition> currentPositionsByAccount(@Param("accountId") UUID accountId);

    /** Interface projection for currentPositionsByAccount's two-column result. */
    interface SymbolPosition {
        String getSymbol();
        BigDecimal getQuantity();
    }
}
