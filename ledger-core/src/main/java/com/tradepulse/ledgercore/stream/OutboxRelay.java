package com.tradepulse.ledgercore.stream;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradepulse.ledgercore.domain.Outbox;
import com.tradepulse.ledgercore.repository.OutboxRepository;

/**
 * Relays pending outbox rows onto Redis, one event at a time.
 *
 * relayPendingEvents() itself is deliberately NOT @Transactional: it reads
 * the whole pending batch with a plain (non-transactional) findBy query,
 * then hands each row to relayOne(), which IS wrapped in its own
 * transaction via TransactionTemplate. That per-event boundary matters for
 * two reasons:
 *
 *  - OutboxRepository.markPublished is a @Modifying @Query method, which
 *    (like any DML through Hibernate) requires an active transaction to
 *    execute at all - without one, Hibernate throws
 *    TransactionRequiredException, which is exactly the bug this fixes.
 *  - The existing try/catch-per-event semantics (one bad row logs and gets
 *    retried next tick, without blocking the rest of the batch) only hold
 *    if each row's XADD + markPublished commit or roll back independently.
 *    A single @Transactional on relayPendingEvents() would put the whole
 *    batch in one transaction, so one failing row would roll back every
 *    markPublished call already applied earlier in the same tick - rows
 *    that successfully relayed would get re-sent on the next tick too.
 *
 * TransactionTemplate (rather than @Transactional on a private helper) is
 * used because Spring's proxy-based AOP can't intercept a method calling
 * itself on `this` - a private (or even public) @Transactional method
 * invoked from within the same class bypasses the proxy entirely and would
 * silently run with no transaction, which is the same bug in a new
 * disguise.
 */
@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

    private final OutboxRepository outboxRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final String streamName;
    private final TransactionTemplate transactionTemplate;

    public OutboxRelay(
            OutboxRepository outboxRepository,
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            @Value("${ledger.outbox.stream-name}") String streamName,
            PlatformTransactionManager transactionManager
    ) {
        this.outboxRepository = outboxRepository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.streamName = streamName;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Scheduled(fixedDelayString = "${ledger.outbox.relay-interval-ms}")
    public void relayPendingEvents() {
        List<Outbox> pending = outboxRepository.findByPublishedAtIsNullOrderByCreatedAtAsc();
        for (Outbox event : pending) {
            try {
                relayOne(event);
            } catch (Exception ex) {
                log.error("Failed to relay outbox event {}: {}", event.getId(), ex.getMessage(), ex);
            }
        }
    }

    private void relayOne(Outbox event) throws Exception {
        // Build the Redis fields (including the JSON serialization, which
        // throws a checked exception) before opening the transaction -
        // TransactionCallbackWithoutResult's lambda can't declare checked
        // exceptions, so only the transactional DB/Redis work goes inside it.
        Map<String, String> fields = new HashMap<>();
        fields.put("aggregateType", event.getAggregateType());
        fields.put("aggregateId", event.getAggregateId().toString());
        fields.put("eventType", event.getEventType());
        fields.put("payload", objectMapper.writeValueAsString(event.getPayload()));

        transactionTemplate.executeWithoutResult(status -> {
            redisTemplate.opsForStream().add(streamName, fields);
            outboxRepository.markPublished(event.getId(), OffsetDateTime.now());
        });
    }
}