package com.tradepulse.ledgercore.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import com.tradepulse.ledgercore.domain.Order;
import com.tradepulse.ledgercore.domain.Trade;
import com.tradepulse.ledgercore.repository.OrderRepository;

/**
 * An in-memory index of every WORKING order, by symbol, holding just
 * enough of each one (id, side, limitPrice) to decide whether a tick
 * crosses it - so MarketTickConsumer's per-tick call into
 * OrderService.handleTick never needs the database just to find out
 * which orders exist or whether they cross. Only an actual crossing
 * (rare) touches the database at all, to fill it.
 *
 * This started as a plain per-symbol *count*, used only to skip the
 * database entirely when a symbol had zero WORKING orders. That helped
 * the "no LIMIT orders anywhere" case, but not the case Phase 8 actually
 * exists for: a symbol that DOES have resting orders. The moment any
 * BTCUSD order went WORKING, handleTick resumed querying the database on
 * every single BTCUSD tick - and BTCUSD ticks fast enough that cg:ledger-
 * core's lag climbed right back into the thousands. Holding the actual
 * (id, side, limitPrice) tuples in memory, not just a count, removes the
 * database from the hot path entirely rather than just narrowing when
 * it's hit.
 *
 * Kept in sync by every writer that creates or resolves a WORKING order:
 * OrderServiceImpl.resolveLimitOrder adds an entry on markWorking(),
 * OrderServiceImpl.fillIfStillWorking and OrderExpirySweep both remove
 * an order's entry whenever it leaves WORKING (filled, rejected, or
 * expired - exactly once per order, whichever happens). Seeded once at
 * startup from the real WORKING rows in the database, since this index
 * starts empty regardless of what was already WORKING before this
 * restart.
 *
 * CopyOnWriteArrayList per symbol is the right trade-off here: reads
 * (once per tick, on every tick for a symbol with any resting order at
 * all) are far more frequent than writes (an order going WORKING, or
 * leaving WORKING - both comparatively rare events), and CopyOnWrite
 * gives lock-free, snapshot-consistent iteration for the frequent case
 * at the cost of an array copy on the rare one.
 */
@Component
public class WorkingOrderTracker {

    /**
     * The minimal shape needed to decide whether a tick crosses an
     * order - not the full Order entity, so this index never holds a
     * stale copy of anything that actually changes (status, etc.);
     * status changes are the database's job, this is purely a crossing
     * lookup.
     */
    private record WorkingOrderRef(UUID orderId, Trade.Side side, BigDecimal limitPrice) {
        boolean crosses(BigDecimal marketPrice) {
            return side == Trade.Side.BUY
                    ? marketPrice.compareTo(limitPrice) <= 0
                    : marketPrice.compareTo(limitPrice) >= 0;
        }
    }

    private final OrderRepository orderRepository;
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<WorkingOrderRef>> refsBySymbol = new ConcurrentHashMap<>();

    public WorkingOrderTracker(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @PostConstruct
    void seedFromDatabase() {
        for (Order order : orderRepository.findByStatus(Order.Status.WORKING)) {
            add(order.getSymbol(), order.getId(), order.getSide(), order.getLimitPrice());
        }
    }

    public void add(String symbol, UUID orderId, Trade.Side side, BigDecimal limitPrice) {
        refsBySymbol.computeIfAbsent(symbol, s -> new CopyOnWriteArrayList<>())
                .add(new WorkingOrderRef(orderId, side, limitPrice));
    }

    public void remove(String symbol, UUID orderId) {
        CopyOnWriteArrayList<WorkingOrderRef> refs = refsBySymbol.get(symbol);
        if (refs != null) {
            refs.removeIf(ref -> ref.orderId().equals(orderId));
        }
    }

    /**
     * Every WORKING order id on this symbol whose (side, limitPrice)
     * crosses marketPrice - pure in-memory computation, no database
     * access. Empty for a symbol with no entries at all, which is the
     * overwhelming majority of ticks.
     */
    public List<UUID> crossingOrderIds(String symbol, BigDecimal marketPrice) {
        CopyOnWriteArrayList<WorkingOrderRef> refs = refsBySymbol.get(symbol);
        if (refs == null || refs.isEmpty()) {
            return List.of();
        }
        return refs.stream()
                .filter(ref -> ref.crosses(marketPrice))
                .map(WorkingOrderRef::orderId)
                .toList();
    }
}
