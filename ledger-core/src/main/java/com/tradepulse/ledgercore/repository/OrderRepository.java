package com.tradepulse.ledgercore.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.Order;

/**
 * Spring Data JPA generates the implementation at runtime. save() (both
 * the initial NEW insert and the fill()/reject() status update) and
 * findByAccountIdOrderByCreatedAtDesc (GET /orders) are all
 * OrderServiceImpl needs so far.
 */
public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByAccountIdOrderByCreatedAtDesc(UUID accountId);
}