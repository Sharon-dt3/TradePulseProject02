package com.tradepulse.ledgercore.marketdata;

import java.math.BigDecimal;
import java.util.Map;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.tradepulse.ledgercore.stream.AbstractStreamConsumer;

/**
 * The cg:ledger-core consumer group on "market.ticks". Turns each raw tick
 * (symbol/price/ts string fields, published by tools/tick-producer) into
 * an update to the live PriceCache.
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

    public MarketTickConsumer(
            StringRedisTemplate redisTemplate,
            PriceCache priceCache,
            @Value("${ledger.market-data.stream-name}") String streamName,
            @Value("${ledger.market-data.consumer-group}") String consumerGroup
    ) {
        super(redisTemplate, streamName, consumerGroup, "ledger-core-1");
        this.priceCache = priceCache;
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
    }
}
