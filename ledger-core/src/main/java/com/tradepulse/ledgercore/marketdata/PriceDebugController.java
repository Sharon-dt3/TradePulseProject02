package com.tradepulse.ledgercore.marketdata;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * TEMPORARY diagnostic endpoint for Phase 3 development - lets us confirm
 * the tick consumer -> PriceCache pipeline is actually working end to end
 * without needing redis-cli. No SecurityConfig changes: this still
 * requires the same Bearer token as every other endpoint, since
 * SecurityConfig's rule is "authenticated by default, permitAll only for
 * /actuator/health".
 *
 * Remove (or fold into a real endpoint) once order-fill logic has its own
 * way to observe prices - this exists purely to unblock verifying this
 * step in isolation.
 */
@RestController
public class PriceDebugController {

    private final PriceCache priceCache;

    public PriceDebugController(PriceCache priceCache) {
        this.priceCache = priceCache;
    }

    @GetMapping("/internal/prices")
    public Map<String, PriceSnapshot> getAllPrices() {
        return priceCache.snapshotAll();
    }
}
