package com.tradepulse.ledgercore.marketdata;

import java.math.BigDecimal;

/**
 * A symbol's latest known price and when it was observed (epoch
 * milliseconds, from the tick's own origin timestamp - see
 * MarketTickConsumer). Used later this phase by MARKET fill logic to
 * decide NO_MARKET / STALE_PRICE / fill-at-price.
 */
public record PriceSnapshot(BigDecimal price, long tsMillis) {
}
