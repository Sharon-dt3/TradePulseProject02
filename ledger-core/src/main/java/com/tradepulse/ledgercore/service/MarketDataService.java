package com.tradepulse.ledgercore.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.tradepulse.ledgercore.marketdata.PriceCache;
import com.tradepulse.ledgercore.marketdata.PriceSnapshot;
import com.tradepulse.ledgercore.web.dto.MarketPriceDto;

/**
 * Read-only view over PriceCache for GET /market/prices - the
 * permission-gated replacement for the old /internal/prices debug
 * endpoint (PriceDebugController, removed). No account/user resolution
 * needed here: unlike PortfolioService, market prices aren't scoped to
 * a caller's own account at all, just to whether they hold market.read.
 */
@Service
public class MarketDataService {

    private static final String MARKET_READ_PERMISSION = "market.read";

    private final PriceCache priceCache;
    private final PermissionService permissionService;

    public MarketDataService(PriceCache priceCache, PermissionService permissionService) {
        this.priceCache = priceCache;
        this.permissionService = permissionService;
    }

    public List<MarketPriceDto> listPrices(List<String> roles) {
        permissionService.requirePermission(roles, MARKET_READ_PERMISSION);

        long now = System.currentTimeMillis();
        Map<String, PriceSnapshot> snapshot = priceCache.snapshotAll();
        return snapshot.entrySet().stream()
                .map(e -> MarketPriceDto.from(e.getKey(), e.getValue(), now))
                .toList();
    }
}
