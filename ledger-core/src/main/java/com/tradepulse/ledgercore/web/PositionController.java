package com.tradepulse.ledgercore.web;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tradepulse.ledgercore.service.PortfolioService;
import com.tradepulse.ledgercore.web.dto.PositionDto;

@RestController
public class PositionController {

    private final PortfolioService portfolioService;

    public PositionController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @GetMapping("/positions")
    public ResponseEntity<List<PositionDto>> listPositions(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID userId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        return ResponseEntity.ok(portfolioService.listPositions(roles, userId));
    }
}
