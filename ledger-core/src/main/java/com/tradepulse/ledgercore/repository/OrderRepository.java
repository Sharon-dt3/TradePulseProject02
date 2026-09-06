package com.tradepulse.ledgercore.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.Order;

/**
 * Spring Data JPA generates the implementation at runtime. save() (both
 * the initial NEW insert and the fill()/reject() status update) is all
 * OrderServiceImpl needs so far - no custom query methods yet.
 */
public interface OrderRepository extends JpaRepository<Order, UUID> {
}
