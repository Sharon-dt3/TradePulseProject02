package com.tradepulse.ledgercore.service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.domain.Order;
import com.tradepulse.ledgercore.domain.RejectionReason;
import com.tradepulse.ledgercore.domain.Trade;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.exception.IdempotencyKeyReusedException;
import com.tradepulse.ledgercore.exception.InvalidOrderRequestException;
import com.tradepulse.ledgercore.exception.OrderNotCancellableException;
import com.tradepulse.ledgercore.exception.OrderNotFoundException;
import com.tradepulse.ledgercore.marketdata.PriceCache;
import com.tradepulse.ledgercore.marketdata.PriceSnapshot;
import com.tradepulse.ledgercore.repository.AccountRepository;
import com.tradepulse.ledgercore.repository.AuditLogRepository;
import com.tradepulse.ledgercore.repository.OrderRepository;
import com.tradepulse.ledgercore.repository.TradeRepository;
import com.tradepulse.ledgercore.web.dto.OrderRequestDto;
import com.tradepulse.ledgercore.web.dto.OrderResultDto;

@Service
public class OrderServiceImpl implements OrderService {

    private static final String ORDER_CREATE_PERMISSION = "orders.create";
    private static final String ORDER_READ_PERMISSION = "orders.read.own";
    private static final String ORDER_CANCEL_PERMISSION = "orders.cancel.own";
    private static final String ORDER_READ_GRANTED_PERMISSION = "orders.read.granted";

    private final AccountService accountService;
    private final AccountRepository accountRepository;
    private final PriceCache priceCache;
    private final LedgerService ledgerService;
    private final ComplianceRules complianceRules;
    private final OrderRepository orderRepository;
    private final WorkingOrderTracker workingOrderTracker;
    private final TradeRepository tradeRepository;
    private final AuditLogRepository auditLogRepository;
    private final PermissionService permissionService;
    private final AccountAccessService accountAccessService;
    private final long maxPriceAgeMs;
    private final long limitOrderDefaultTtlHours;
    private final TransactionTemplate requiresNewTransactionTemplate;
    private final TransactionTemplate transactionTemplate;

    public OrderServiceImpl(
            AccountService accountService,
            AccountRepository accountRepository,
            PriceCache priceCache,
            LedgerService ledgerService,
            ComplianceRules complianceRules,
            OrderRepository orderRepository,
            WorkingOrderTracker workingOrderTracker,
            TradeRepository tradeRepository,
            AuditLogRepository auditLogRepository,
            PermissionService permissionService,
            AccountAccessService accountAccessService,
            @Value("${ledger.max-price-age-ms}") long maxPriceAgeMs,
            @Value("${ledger.limit-order-default-ttl-hours}") long limitOrderDefaultTtlHours,
            PlatformTransactionManager transactionManager
    ) {
        this.accountService = accountService;
        this.accountRepository = accountRepository;
        this.priceCache = priceCache;
        this.ledgerService = ledgerService;
        this.complianceRules = complianceRules;
        this.orderRepository = orderRepository;
        this.workingOrderTracker = workingOrderTracker;
        this.tradeRepository = tradeRepository;
        this.auditLogRepository = auditLogRepository;
        this.permissionService = permissionService;
        this.accountAccessService = accountAccessService;
        this.maxPriceAgeMs = maxPriceAgeMs;
        this.limitOrderDefaultTtlHours = limitOrderDefaultTtlHours;
        this.requiresNewTransactionTemplate = new TransactionTemplate(transactionManager);
        this.requiresNewTransactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        // Plain REQUIRED (TransactionTemplate's default) — resolveOrder
        // always runs with no ambient transaction already active (see
        // its own javadoc), so REQUIRED and REQUIRES_NEW would behave
        // identically here; REQUIRED is used because it's the honest
        // description of what's actually needed at that call site.
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Resolves account ownership, validates the LIMIT/limitPrice pairing,
     * checks/creates the idempotency record, and either replays a cached
     * result or hands off to resolveOrder for a genuinely new order.
     * Deliberately NOT @Transactional itself — see insertOrGetExisting's
     * javadoc for why order-row creation needs its own independent
     * transaction, and resolveOrder's javadoc for why the rest of the
     * work needs a separate one of its own too.
     */
    @Override
    public OrderResultDto placeOrder(List<String> roles, UUID userId, OrderRequestDto request) {
        permissionService.requirePermission(roles, ORDER_CREATE_PERMISSION);
        validateLimitFields(request);

        Account account = accountService.getAccountForUser(userId)
                .orElseThrow(() -> AccountNotFoundException.forUserId(userId));

        String hash = RequestHasher.hash(account.getId(), request.symbol(), request.side(),
                request.orderType(), request.quantity(), request.limitPrice());

        Optional<Order> existing = orderRepository.findByAccountIdAndRequestId(account.getId(), request.requestId());
        if (existing.isPresent()) {
            return replayOrConflict(existing.get(), hash);
        }

        InsertOutcome outcome = insertOrGetExisting(account.getId(), request, hash);
        if (!outcome.wasNewlyInserted()) {
            // Lost a race: another request with this same requestId
            // committed first, in the gap between our lookup above and
            // our own insert attempt. Handle it exactly like the
            // upfront-lookup case - same hash means it's genuinely our
            // own request arriving twice, different hash means a true
            // conflict.
            return replayOrConflict(outcome.order(), hash);
        }

        return resolveOrder(account, outcome.order(), userId, request);
    }

    /**
     * jakarta.validation's field-level annotations can't express "required
     * if and only if orderType is LIMIT" — that's a relationship between
     * two fields, not a constraint on either alone — so it's checked here
     * instead, before anything is hashed or persisted.
     */
    private void validateLimitFields(OrderRequestDto request) {
        boolean isLimit = request.orderType() == Order.OrderType.LIMIT;
        if (isLimit && request.limitPrice() == null) {
            throw InvalidOrderRequestException.limitPriceRequired();
        }
        if (!isLimit && request.limitPrice() != null) {
            throw InvalidOrderRequestException.limitPriceNotAllowed();
        }
    }

    private OrderResultDto replayOrConflict(Order existing, String hash) {
        if (!existing.getRequestHash().equals(hash)) {
            throw IdempotencyKeyReusedException.forRequestId(existing.getRequestId());
        }
        Trade trade = existing.getStatus() == Order.Status.FILLED
                ? tradeRepository.findByOrderIdIn(List.of(existing.getId())).stream().findFirst().orElse(null)
                : null;
        return OrderResultDto.from(existing, trade);
    }

    private record InsertOutcome(Order order, boolean wasNewlyInserted) {
    }

    /**
     * Creates the order row in its own independent transaction
     * (PROPAGATION_REQUIRES_NEW), suspending whatever transaction the
     * caller is in and committing or rolling back this insert on its
     * own.
     *
     * Why a separate transaction rather than @Transactional on a
     * private helper: Spring's proxy-based AOP can't intercept a method
     * calling itself on `this` - a private (or public) @Transactional
     * method invoked from within the same class bypasses the proxy
     * entirely, which is the exact bug OutboxRelay had earlier today.
     * TransactionTemplate sidesteps that the same way it did there.
     *
     * Why REQUIRES_NEW specifically: catching a constraint violation
     * cleanly requires the failed INSERT's transaction to actually end
     * (commit or rollback) right there, not remain part of a larger
     * transaction that would otherwise carry a "must roll back" flag
     * forward into everything else placeOrder still needs to do.
     *
     * Order.market()/limit() (Phase 8) enforce the same MARKET-never-
     * has-a-limit-price / LIMIT-always-does split V15's CHECK constraint
     * enforces in the database — resolveExpiresAt below fills in the
     * server default only for the LIMIT branch, since a MARKET order has
     * no expires_at at all.
     */
    private InsertOutcome insertOrGetExisting(UUID accountId, OrderRequestDto request, String hash) {
        Order candidate = request.orderType() == Order.OrderType.LIMIT
                ? Order.limit(accountId, request.symbol(), request.side(), request.quantity(),
                        request.limitPrice(), resolveExpiresAt(request), request.requestId(), hash)
                : Order.market(accountId, request.symbol(), request.side(), request.quantity(),
                        request.requestId(), hash);
        try {
            requiresNewTransactionTemplate.executeWithoutResult(status ->
                    orderRepository.saveAndFlush(candidate));
            return new InsertOutcome(candidate, true);
        } catch (DataIntegrityViolationException raceLost) {
            // The unique index from V13__orders_idempotency.sql is what
            // makes this detectable at all. A matching row must exist
            // now; if it somehow doesn't, something other than this
            // exact race caused the violation, so surface the original
            // failure rather than hiding it behind a confusing
            // NoSuchElementException.
            Order winner = orderRepository.findByAccountIdAndRequestId(accountId, request.requestId())
                    .orElseThrow(() -> raceLost);
            return new InsertOutcome(winner, false);
        }
    }

    /**
     * The client's expiresAt if it supplied one, otherwise a server
     * default TTL from now. Only ever called for a LIMIT order.
     */
    private OffsetDateTime resolveExpiresAt(OrderRequestDto request) {
        return request.expiresAt() != null
                ? request.expiresAt()
                : OffsetDateTime.now().plusHours(limitOrderDefaultTtlHours);
    }

    /**
     * The placement-time handling for a freshly-created order — run
     * inside its own explicit transaction (via transactionTemplate)
     * rather than inheriting one from the caller, since placeOrder itself
     * is no longer @Transactional (see its own javadoc for why). Without
     * this, the reject path's order-status update and audit-log write
     * would each auto-commit separately instead of atomically together.
     *
     * Phase 9: a frozen account rejects every new order, checked once
     * here rather than duplicated inside both the MARKET branch and
     * resolveLimitOrder — freezing is a property of the account, not of
     * either order type, so it belongs before that split, not inside it.
     *
     * MARKET keeps Phase 3/4's original behavior unchanged: no live price
     * (or a stale one) is fatal, since a MARKET order has no other way to
     * ever fill. LIMIT is different — see resolveLimitOrder's own javadoc.
     */
    private OrderResultDto resolveOrder(Account account, Order order, UUID userId, OrderRequestDto request) {
        return transactionTemplate.execute(status -> {
            if (account.isFrozen()) {
                return reject(order, userId, RejectionReason.ACCOUNT_FROZEN);
            }

            if (order.getOrderType() == Order.OrderType.LIMIT) {
                return resolveLimitOrder(account, order, userId, request);
            }

            Optional<PriceSnapshot> latestPrice = priceCache.getLatest(request.symbol());
            if (latestPrice.isEmpty()) {
                return reject(order, userId, RejectionReason.NO_MARKET);
            }

            PriceSnapshot price = latestPrice.get();
            long ageMs = System.currentTimeMillis() - price.tsMillis();
            if (ageMs > maxPriceAgeMs) {
                return reject(order, userId, RejectionReason.STALE_PRICE);
            }

            return attemptFill(account, order, userId, request.symbol(), request.side(), request.quantity(), price.price());
        });
    }

    /**
     * A LIMIT order's placement-time handling: unlike MARKET, an absent
     * or stale price is not fatal — a LIMIT order exists precisely to
     * wait for the market to come to it, so "no live price yet" is a
     * perfectly normal outcome, not a rejection. It only fills right now
     * if a fresh price exists AND it already crosses (order.crosses());
     * otherwise it goes WORKING and handleTick decides its fate from here
     * on, per tick.
     */
    private OrderResultDto resolveLimitOrder(Account account, Order order, UUID userId, OrderRequestDto request) {
        Optional<PriceSnapshot> latestPrice = priceCache.getLatest(request.symbol());
        boolean hasFreshPrice = latestPrice.isPresent()
                && (System.currentTimeMillis() - latestPrice.get().tsMillis()) <= maxPriceAgeMs;

        if (hasFreshPrice && order.crosses(latestPrice.get().price())) {
            // Fills at the order's own limit price, not the (possibly
            // better) current market price - Phase 8's checklist is
            // explicit: "fill at the limit price, never worse than
            // specified," not "fill at whatever price triggered it."
            return attemptFill(account, order, userId, request.symbol(), request.side(), request.quantity(),
                    order.getLimitPrice());
        }

        order.markWorking();
        orderRepository.save(order);
        workingOrderTracker.add(order.getSymbol(), order.getId(), order.getSide(), order.getLimitPrice());
        return OrderResultDto.from(order, null);
    }

    /**
     * The compliance-check-then-fill sequence shared by every path that
     * can actually execute a trade: a MARKET order at placement, a LIMIT
     * order that already crosses at placement, and a WORKING LIMIT order
     * a later tick has just crossed (see handleTick). Always fills at the
     * given price, never a different one — for a LIMIT order that price
     * is only ever passed in once order.crosses() has already confirmed
     * it's at least as good as the limit.
     */
    private OrderResultDto attemptFill(Account account, Order order, UUID userId, String symbol, Trade.Side side,
                                        BigDecimal quantity, BigDecimal fillPrice) {
        BigDecimal currentPosition = tradeRepository.currentPosition(account.getId(), symbol);
        Optional<RejectionReason> violation = complianceRules.firstViolation(
                account, side, quantity, currentPosition, fillPrice);
        if (violation.isPresent()) {
            return reject(order, userId, violation.get());
        }

        OffsetDateTime executedAt = OffsetDateTime.now();
        Trade trade = ledgerService.postTrade(order.getId(), account.getId(), userId,
                symbol, side, quantity, fillPrice, executedAt);

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
    public List<OrderResultDto> listOrders(List<String> roles, UUID userId) {
        permissionService.requirePermission(roles, ORDER_READ_PERMISSION);
        Account account = accountService.getAccountForUser(userId)
                .orElseThrow(() -> AccountNotFoundException.forUserId(userId));
        return buildOrderResults(account.getId());
    }

    @Override
    public List<OrderResultDto> listOrdersForAccount(List<String> roles, UUID callerId, UUID accountId) {
        Account account = accountAccessService.resolveReadableAccount(
                roles, callerId, accountId, ORDER_READ_PERMISSION, ORDER_READ_GRANTED_PERMISSION);
        return buildOrderResults(account.getId());
    }

    private List<OrderResultDto> buildOrderResults(UUID accountId) {
        List<Order> orders = orderRepository.findByAccountIdOrderByCreatedAtDesc(accountId);

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

    /**
     * Called once per tick. workingOrderTracker.crossingOrderIds does the
     * actual crossing check purely in memory (see its own javadoc for
     * why a database query here doesn't scale to real tick volume), so
     * this method touches the database only for orders that actually
     * cross - refetched and refilled in its own transaction
     * (requiresNewTransactionTemplate) rather than one transaction for
     * the whole batch, for two reasons: one order's compliance rejection
     * must not roll back another order's successful fill earlier in the
     * same tick, and refetching by id right before acting on it guards
     * against a race with the expiry sweep (Phase 8's other WORKING-
     * order writer) marking this same order EXPIRED between the tracker
     * check and this order's turn.
     */
    @Override
    public void handleTick(String symbol, BigDecimal tickPrice) {
        for (UUID orderId : workingOrderTracker.crossingOrderIds(symbol, tickPrice)) {
            requiresNewTransactionTemplate.executeWithoutResult(status -> fillIfStillWorking(orderId, tickPrice));
        }
    }

    private void fillIfStillWorking(UUID orderId, BigDecimal tickPrice) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getStatus() != Order.Status.WORKING) {
            // Already resolved by something else since the scan (the
            // expiry sweep, or - not possible with a single-threaded tick
            // consumer today, but harmless if that ever changes - another
            // tick) between findBySymbolAndStatus and this order's turn.
            return;
        }

        Account account = accountRepository.findById(order.getAccountId())
                .orElseThrow(() -> new IllegalStateException(
                        "Order " + orderId + " references missing account " + order.getAccountId()));

        // Same reasoning as resolveLimitOrder's immediate-cross case: the
        // tick only decides that this order now crosses (order.crosses(
        // tickPrice) in handleTick, above); the fill itself always
        // executes at the order's own limitPrice, never the tick price.
        attemptFill(account, order, account.getUserId(), order.getSymbol(), order.getSide(),
                order.getQuantity(), order.getLimitPrice());
        // This order is leaving WORKING (filled or rejected - either way
        // attemptFill just resolved it), so its entry must come out of
        // the index or a later tick would try to fill it again.
        workingOrderTracker.remove(order.getSymbol(), order.getId());
    }

    @Override
    public OrderResultDto cancelOrder(List<String> roles, UUID userId, UUID orderId) {
        permissionService.requirePermission(roles, ORDER_CANCEL_PERMISSION);

        Account account = accountService.getAccountForUser(userId)
                .orElseThrow(() -> AccountNotFoundException.forUserId(userId));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> OrderNotFoundException.forId(orderId));

        // Ownership is checked by comparing accountId, not by querying
        // "this account's own order" directly - a mismatch here is treated
        // identically to a nonexistent order (same exception, same 404), so
        // a client can't use this endpoint to learn that some other
        // account's order id exists.
        if (!order.getAccountId().equals(account.getId())) {
            throw OrderNotFoundException.forId(orderId);
        }

        if (order.getStatus() != Order.Status.WORKING) {
            throw OrderNotCancellableException.forStatus(order.getId(), order.getStatus());
        }

        return transactionTemplate.execute(status -> {
            order.cancel();
            orderRepository.save(order);
            // Leaving WORKING the same way a fill/reject does (see
            // fillIfStillWorking) - must come out of the tracker or a later
            // tick would still try to fill it.
            workingOrderTracker.remove(order.getSymbol(), order.getId());

            auditLogRepository.save(new AuditLog(
                    userId,
                    "ORDER_CANCELLED",
                    "order",
                    order.getId(),
                    Map.of(
                            "symbol", order.getSymbol(),
                            "side", order.getSide().name(),
                            "quantity", order.getQuantity()
                    )
            ));

            return OrderResultDto.from(order, null);
        });
    }
}
