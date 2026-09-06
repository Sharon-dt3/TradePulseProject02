package com.tradepulse.ledgercore.marketdata;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Live latest-price-per-symbol cache, built from consumed market ticks.
 * Purely in-memory - if this process restarts, the cache is empty until
 * new ticks arrive (acceptable for v1: a fresh MARKET order simply sees
 * NO_MARKET until the next tick lands, rather than trusting stale data
 * that predates the restart).
 */
@Component
public class PriceCache {

    private final Map<String, PriceSnapshot> latestBySymbol = new ConcurrentHashMap<>();

    /**
     * Records a new observed price for a symbol. Guards against
     * out-of-order delivery (a redelivered/retried older tick arriving
     * after a fresher one already updated the cache) by only overwriting
     * when the incoming tick's timestamp is not older than what's
     * currently cached.
     */
    public void update(String symbol, BigDecimal price, long tsMillis) {
        latestBySymbol.merge(
                symbol,
                new PriceSnapshot(price, tsMillis),
                (existing, incoming) -> incoming.tsMillis() >= existing.tsMillis() ? incoming : existing
        );
    }

    public Optional<PriceSnapshot> getLatest(String symbol) {
        return Optional.ofNullable(latestBySymbol.get(symbol));
    }

    /** Diagnostics only - e.g. the temporary /internal/prices endpoint. */
    public Map<String, PriceSnapshot> snapshotAll() {
        return Map.copyOf(latestBySymbol);
    }
}
