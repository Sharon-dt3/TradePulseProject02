package com.tradepulse.ledgercore.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tradepulse.ledgercore.service.MarketDataService;
import com.tradepulse.ledgercore.web.dto.MarketPriceDto;

@RestController
public class MarketController {

    private final MarketDataService marketDataService;

    public MarketController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @GetMapping("/market/prices")
    public ResponseEntity<List<MarketPriceDto>> listPrices(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        List<String> roles = jwt.getClaimAsStringList("user_role");

        return ResponseEntity.ok(marketDataService.listPrices(roles));
    }
}
