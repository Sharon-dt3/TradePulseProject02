package com.tradepulse.ledgercore.web;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.tradepulse.ledgercore.service.OrderService;
import com.tradepulse.ledgercore.web.dto.OrderRequestDto;
import com.tradepulse.ledgercore.web.dto.OrderResultDto;

/**
 * Routing and request/response translation only — no business logic,
 * same split as AccountController. The account an order posts against
 * is never read from the request body; it's derived from jwt.sub inside
 * OrderService, per BLUEPRINT.md §4's ownership-scoping rule.
 */
@RestController
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderResultDto> placeOrder(
            @Valid @RequestBody OrderRequestDto request,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID userId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        OrderResultDto result = orderService.placeOrder(roles, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResultDto>> listOrders(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID userId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        return ResponseEntity.ok(orderService.listOrders(roles, userId));
    }

    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<OrderResultDto> cancelOrder(
            @PathVariable UUID orderId,
            Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID userId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("user_role");

        OrderResultDto result = orderService.cancelOrder(roles, userId, orderId);
        return ResponseEntity.ok(result);
    }
}