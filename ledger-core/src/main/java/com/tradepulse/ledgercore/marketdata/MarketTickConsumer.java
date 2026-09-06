package com.tradepulse.ledgercore.marketdata;

import java.math.BigDecimal;
import java.util.Map;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.tradepulse.ledgercore.service.OrderService;
import com.tradepulse.ledgercore.stream.AbstractStreamConsumer;

/**
 * The cg:ledger-core consumer group on "market.ticks". Turns each raw tick
 * (symbol/price/ts string fields, published by tools/tick-producer) into
 * an update to the live PriceCache, then (Phase 8) hands the same tick to
 * OrderService.handleTick so any WORKING LIMIT order on this symbol that
 * now crosses gets a chance to fill before the next tick arrives — the
 * price cache is updated first so a crossing check inside handleTick (or
 * anything else it triggers) always sees this tick's price as "current."
 *
 * "ledger-core-1" is a single hardcoded consumer name - correct for one
 * running instance. Horizontally scaling ledger-core would need a real
 * per-instance name (e.g. derived from hostname or a generated instance
 * ID) so each instance is a distinct consumer within the same group; not
 * needed yet, called out here so it isn't a silent trap later.
 */
@Component
public class MarketTickConsumer extends AbstractStreamConsumer {

    private final PriceCache priceCache;
    private final OrderService orderService;

    public MarketTickConsumer(
            StringRedisTemplate redisTemplate,
            PriceCache priceCache,
            OrderService orderService,
            @Value("${ledger.market-data.stream-name}") String streamName,
            @Value("${ledger.market-data.consumer-group}") String consumerGroup
    ) {
        super(redisTemplate, streamName, consumerGroup, "ledger-core-1");
        this.priceCache = priceCache;
        this.orderService = orderService;
    }

    @PostConstruct
    void onStartup() {
        start();
    }

    @Override
    protected void handleRecord(MapRecord<String, String, String> record) {
        Map<String, String> fields = record.getValue();
        String symbol = fields.get("symbol");
        BigDecimal price = new BigDecimal(fields.get("price"));
        long tsMillis = Long.parseLong(fields.get("ts"));
        priceCache.update(symbol, price, tsMillis);
        orderService.handleTick(symbol, price);
    }
}
