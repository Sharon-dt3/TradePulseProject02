package com.tradepulse.ledgercore.service;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.tradepulse.ledgercore.domain.Order;
import com.tradepulse.ledgercore.repository.OrderRepository;

/**
 * Phase 8's scheduled past-due sweep: every ledger.limit-order-expiry-
 * sweep-interval-ms, marks every WORKING order whose expires_at has
 * passed as EXPIRED.
 *
 * @Transactional directly on the @Scheduled method is safe here, unlike
 * the self-invocation bug OutboxRelay hit earlier — that bug was a method
 * calling another @Transactional method on `this` from inside the same
 * class, which bypasses Spring's proxy entirely. Here, Spring's scheduler
 * invokes sweep() from outside this class, on the proxied bean it holds
 * from the application context, so the proxy - and the transaction it
 * opens - is very much in effect.
 *
 * Unlike a tick-triggered fill (attemptFill), expiring an order is a pure
 * status flip with no compliance check and no ledger write, so the whole
 * batch is one transaction rather than one per order - there's no
 * scenario here where one order's outcome should be isolated from
 * another's.
 */
@Component
public class OrderExpirySweep {

    private final OrderRepository orderRepository;
    private final WorkingOrderTracker workingOrderTracker;

    public OrderExpirySweep(OrderRepository orderRepository, WorkingOrderTracker workingOrderTracker) {
        this.orderRepository = orderRepository;
        this.workingOrderTracker = workingOrderTracker;
    }

    @Scheduled(fixedDelayString = "${ledger.limit-order-expiry-sweep-interval-ms}")
    @Transactional
    public void sweep() {
        List<Order> pastDue = orderRepository.findByStatusAndExpiresAtBefore(Order.Status.WORKING, OffsetDateTime.now());
        for (Order order : pastDue) {
            order.expire();
            workingOrderTracker.remove(order.getSymbol(), order.getId());
        }
        orderRepository.saveAll(pastDue);
    }
}
