package com.tradepulse.ledgercore.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.Order;

/**
 * Spring Data JPA generates the implementation at runtime.
 * findBySymbolAndStatus (Phase 8) backs MarketTickConsumer's per-tick scan
 * for crossing WORKING orders — idx_orders_symbol_status
 * (V15__limit_orders.sql) exists specifically for this query.
 * findByStatusAndExpiresAtBefore (Phase 8) backs OrderExpirySweep's
 * periodic past-due scan.
 */
public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByAccountIdOrderByCreatedAtDesc(UUID accountId);
    Optional<Order> findByAccountIdAndRequestId(UUID accountId, UUID requestId);
    List<Order> findBySymbolAndStatus(String symbol, Order.Status status);
    List<Order> findByStatusAndExpiresAtBefore(Order.Status status, OffsetDateTime cutoff);
    List<Order> findByStatus(Order.Status status);
}
