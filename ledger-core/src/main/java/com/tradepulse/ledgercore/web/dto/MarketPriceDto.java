package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;

import com.tradepulse.ledgercore.marketdata.PriceSnapshot;

/**
 * Response body for GET /market/prices - age (in milliseconds, computed
 * at response time) rather than the snapshot's raw tsMillis, since
 * "how stale is this" is what a caller actually wants to know, and
 * matches the same age-based staleness check MARKET order fills already
 * use internally (see OrderServiceImpl.maxPriceAgeMs).
 */
public record MarketPriceDto(String symbol, BigDecimal price, long ageMs) {
    public static MarketPriceDto from(String symbol, PriceSnapshot snapshot, long nowMillis) {
        return new MarketPriceDto(symbol, snapshot.price(), nowMillis - snapshot.tsMillis());
    }
}
