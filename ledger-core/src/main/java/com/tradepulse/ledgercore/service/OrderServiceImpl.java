package com.tradepulse.ledgercore.service;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.domain.Order;
import com.tradepulse.ledgercore.domain.Trade;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.marketdata.PriceCache;
import com.tradepulse.ledgercore.marketdata.PriceSnapshot;
import com.tradepulse.ledgercore.repository.AuditLogRepository;
import com.tradepulse.ledgercore.repository.OrderRepository;
import com.tradepulse.ledgercore.web.dto.OrderRequestDto;
import com.tradepulse.ledgercore.web.dto.OrderResultDto;
import com.tradepulse.ledgercore.web.dto.RejectionReason;

@Service
public class OrderServiceImpl implements OrderService {

    private final AccountService accountService;
    private final PriceCache priceCache;
    private final LedgerService ledgerService;
    private final OrderRepository orderRepository;
    private final AuditLogRepository auditLogRepository;
    private final long maxPriceAgeMs;

    public OrderServiceImpl(
            AccountService accountService,
            PriceCache priceCache,
            LedgerService ledgerService,
            OrderRepository orderRepository,
            AuditLogRepository auditLogRepository,
            @Value("${ledger.max-price-age-ms}") long maxPriceAgeMs
    ) {
        this.accountService = accountService;
        this.priceCache = priceCache;
        this.ledgerService = ledgerService;
        this.orderRepository = orderRepository;
        this.auditLogRepository = auditLogRepository;
        this.maxPriceAgeMs = maxPriceAgeMs;
    }

    /**
     * One @Transactional method covering order creation, the price/
     * staleness check, and either the fill (which delegates to
     * LedgerService.postTrade, joining this same transaction per its own
     * "never a separate transaction" rule) or the reject — so a crash
     * partway through can never leave an order FILLED without a trade,
     * or vice versa.
     *
     * Note on account state: Phase 3 does not check accounts.frozen here
     * — "a frozen account rejects new orders" is Phase 9's own
     * verification checkpoint, not this phase's. Nothing here should be
     * read as an oversight if a frozen account can still place an order
     * today.
     */
    @Override
    @Transactional
    public OrderResultDto placeOrder(UUID userId, OrderRequestDto request) {
        Account account = accountService.getAccountForUser(userId)
                .orElseThrow(() -> AccountNotFoundException.forUserId(userId));

        Order order = new Order(account.getId(), request.symbol(), request.side(),
                request.orderType(), request.quantity());
        orderRepository.save(order);

        Optional<PriceSnapshot> latestPrice = priceCache.getLatest(request.symbol());
        if (latestPrice.isEmpty()) {
            return reject(order, userId, RejectionReason.NO_MARKET);
        }

        PriceSnapshot price = latestPrice.get();
        long ageMs = System.currentTimeMillis() - price.tsMillis();
        if (ageMs > maxPriceAgeMs) {
            return reject(order, userId, RejectionReason.STALE_PRICE);
        }

        OffsetDateTime executedAt = OffsetDateTime.now();
        Trade trade = ledgerService.postTrade(order.getId(), account.getId(), userId,
                request.symbol(), request.side(), request.quantity(), price.price(), executedAt);

        order.fill();
        orderRepository.save(order);

        return OrderResultDto.filled(order, trade);
    }

    private OrderResultDto reject(Order order, UUID actorUserId, RejectionReason reason) {
        order.reject();
        orderRepository.save(order);

        auditLogRepository.save(new AuditLog(
                actorUserId,
                "ORDER_REJECTED",
                "order",
                order.getId(),
                Map.of(
                        "symbol", order.getSymbol(),
                        "side", order.getSide().name(),
                        "quantity", order.getQuantity(),
                        "reason", reason.name()
                )
        ));

        return OrderResultDto.rejected(order, reason);
    }
}
