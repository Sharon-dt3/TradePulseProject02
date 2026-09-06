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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradepulse.ledgercore.domain.Outbox;
import com.tradepulse.ledgercore.repository.OutboxRepository;

/**
 * Drains the outbox table into a Redis stream, on a schedule rather than
 * extending AbstractStreamConsumer: this polls Postgres (a fast query),
 * it doesn't block-read a Redis stream, so a @Scheduled method fits
 * better than a hand-rolled thread loop. Phase 7's cg:risk-engine
 * consumer group (built on AbstractStreamConsumer) reads the stream this
 * class writes into - that's where the "shared scaffolding" reuse the
 * Phase 3 checklist calls out actually happens.
 *
 * A row is left unpublished (never deleted, see the outbox table's own
 * comment in V10__trades_journal_audit_outbox.sql) until markPublished
 * succeeds, so a crash between XADD and markPublished just means the
 * next poll retries it - the consumer on the other end must therefore
 * tolerate a duplicate delivery (at-least-once, same as
 * AbstractStreamConsumer's own delivery semantics).
 */
@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

    private final OutboxRepository outboxRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final String streamName;

    public OutboxRelay(
            OutboxRepository outboxRepository,
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            @Value("${ledger.outbox.stream-name}") String streamName
    ) {
        this.outboxRepository = outboxRepository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.streamName = streamName;
    }

    @Scheduled(fixedDelayString = "${ledger.outbox.relay-interval-ms}")
    public void relayPendingEvents() {
        List<Outbox> pending = outboxRepository.findByPublishedAtIsNullOrderByCreatedAtAsc();

        for (Outbox event : pending) {
            try {
                Map<String, String> fields = new HashMap<>();
                fields.put("aggregateType", event.getAggregateType());
                fields.put("aggregateId", event.getAggregateId().toString());
                fields.put("eventType", event.getEventType());
                fields.put("payload", objectMapper.writeValueAsString(event.getPayload()));

                redisTemplate.opsForStream().add(streamName, fields);
                outboxRepository.markPublished(event.getId(), OffsetDateTime.now());
            } catch (Exception ex) {
                log.error("Failed to relay outbox event {}: {}", event.getId(), ex.getMessage(), ex);
                // Left unpublished - retried on the next scheduled poll.
            }
        }
    }
}
