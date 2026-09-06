package com.tradepulse.ledgercore.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.Trade;

/**
 * Spring Data JPA generates the implementation at runtime. postTrade
 * only needs save(), which JpaRepository already provides.
 * findByOrderIdIn backs OrderServiceImpl.listOrders' one-query batch
 * fetch of fills for a page of orders, instead of one query per order.
 */
public interface TradeRepository extends JpaRepository<Trade, UUID> {
    List<Trade> findByOrderIdIn(Collection<UUID> orderIds);
}