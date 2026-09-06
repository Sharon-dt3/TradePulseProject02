package com.tradepulse.ledgercore.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.domain.Order;
import com.tradepulse.ledgercore.domain.RejectionReason;
import com.tradepulse.ledgercore.domain.Trade;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.marketdata.PriceCache;
import com.tradepulse.ledgercore.marketdata.PriceSnapshot;
import com.tradepulse.ledgercore.repository.AuditLogRepository;
import com.tradepulse.ledgercore.repository.OrderRepository;
import com.tradepulse.ledgercore.repository.TradeRepository;
import com.tradepulse.ledgercore.web.dto.OrderRequestDto;
import com.tradepulse.ledgercore.web.dto.OrderResultDto;

import java.math.BigDecimal;

@Service
public class OrderServiceImpl implements OrderService {

    private final AccountService accountService;
    private final PriceCache priceCache;
    private final LedgerService ledgerService;
    private final ComplianceRules complianceRules;
    private final OrderRepository orderRepository;
    private final TradeRepository tradeRepository;
    private final AuditLogRepository auditLogRepository;
    private final long maxPriceAgeMs;

    public OrderServiceImpl(
            AccountService accountService,
            PriceCache priceCache,
            LedgerService ledgerService,
            ComplianceRules complianceRules,
            OrderRepository orderRepository,
            TradeRepository tradeRepository,
            AuditLogRepository auditLogRepository,
            @Value("${ledger.max-price-age-ms}") long maxPriceAgeMs
    ) {
        this.accountService = accountService;
        this.priceCache = priceCache;
        this.ledgerService = ledgerService;
        this.complianceRules = complianceRules;
        this.orderRepository = orderRepository;
        this.tradeRepository = tradeRepository;
        this.auditLogRepository = auditLogRepository;
        this.maxPriceAgeMs = maxPriceAgeMs;
    }

    /**
     * One @Transactional method covering order creation, the price/
     * staleness check, Phase 4's compliance check, and either the fill
     * (which delegates to LedgerService.postTrade, joining this same
     * transaction per its own "never a separate transaction" rule) or the
     * reject — so a crash partway through can never leave an order FILLED
     * without a trade, or vice versa.
     *
     * Compliance runs after the price check (a notional check needs a
     * real reference price to mean anything) and before the fill (a
     * rejected order must never reach LedgerService.postTrade) — see
     * ComplianceRules' javadoc for the two checks themselves and why
     * they're ordered the way they are.
     *
     * Note on account state: Phase 3/4 do not check accounts.frozen here
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

        BigDecimal currentPosition = tradeRepository.currentPosition(account.getId(), request.symbol());
        Optional<RejectionReason> violation = complianceRules.firstViolation(
                account, request.side(), request.quantity(), currentPosition, price.price());
        if (violation.isPresent()) {
            return reject(order, userId, violation.get());
        }

        OffsetDateTime executedAt = OffsetDateTime.now();
        Trade trade = ledgerService.postTrade(order.getId(), account.getId(), userId,
                request.symbol(), request.side(), request.quantity(), price.price(), executedAt);

        order.fill();
        orderRepository.save(order);

        return OrderResultDto.from(order, trade);
    }

    private OrderResultDto reject(Order order, UUID actorUserId, RejectionReason reason) {
        order.reject(reason);
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

        return OrderResultDto.from(order, null);
    }

    /**
     * Every order the caller's account has ever placed, newest first.
     * FILLED orders need their Trade for fillPrice/executedAt — fetched
     * once for the whole list (findByOrderIdIn) rather than per order,
     * so this stays one extra query regardless of how many orders come
     * back. REJECTED orders need no such lookup: rejectionReason is
     * read straight off the Order row (see RejectionReason's javadoc for
     * why that's persisted now).
     */
    @Override
    public List<OrderResultDto> listOrders(UUID userId) {
        Account account = accountService.getAccountForUser(userId)
                .orElseThrow(() -> AccountNotFoundException.forUserId(userId));

        List<Order> orders = orderRepository.findByAccountIdOrderByCreatedAtDesc(account.getId());

        List<UUID> filledOrderIds = orders.stream()
                .filter(o -> o.getStatus() == Order.Status.FILLED)
                .map(Order::getId)
                .toList();

        Map<UUID, Trade> tradeByOrderId = filledOrderIds.isEmpty()
                ? Map.of()
                : tradeRepository.findByOrderIdIn(filledOrderIds).stream()
                        .collect(Collectors.toMap(Trade::getOrderId, Function.identity()));

        return orders.stream()
                .map(order -> OrderResultDto.from(order, tradeByOrderId.get(order.getId())))
                .toList();
    }
}