package com.tradepulse.ledgercore.stream;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Reusable Redis Streams consumer-group scaffolding.
 *
 * Built once, extended by every consumer group in the project - this
 * phase's MarketTickConsumer (stream "market.ticks", group
 * "cg:ledger-core"), and Phase 7's risk-engine consumer, rather than each
 * one reinventing group-creation and read-loop plumbing its own way.
 *
 * Delivery semantics: at-least-once. A record is only XACK'd after
 * handleRecord() returns successfully; if the process crashes (or
 * handleRecord throws) between delivery and ack, the same record is
 * redelivered on the next read for this consumer. Subclasses must make
 * handleRecord() safe to run more than once for the same record.
 */
public abstract class AbstractStreamConsumer implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(AbstractStreamConsumer.class);

    private final StreamOperations<String, String, String> streamOps;
    private final String streamKey;
    private final String consumerGroup;
    private final String consumerName;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private Thread workerThread;

    protected AbstractStreamConsumer(
            StringRedisTemplate redisTemplate,
            String streamKey,
            String consumerGroup,
            String consumerName
    ) {
        this.streamOps = redisTemplate.opsForStream();
        this.streamKey = streamKey;
        this.consumerGroup = consumerGroup;
        this.consumerName = consumerName;
    }

    /**
     * Starts the background read loop. Idempotent - calling this more than
     * once while already running has no effect.
     */
    public final void start() {
        if (!running.compareAndSet(false, true)) {
            return;
        }
        ensureConsumerGroupExists();
        workerThread = new Thread(this, consumerGroup + "-" + consumerName);
        workerThread.setDaemon(true);
        workerThread.start();
    }

    @PreDestroy
    public final void stop() {
        running.set(false);
        if (workerThread != null) {
            workerThread.interrupt();
        }
    }

    /**
     * XGROUP CREATE ... MKSTREAM is not itself idempotent - Redis returns
     * a BUSYGROUP error if the group already exists (e.g. after a service
     * restart, where the group was created on a previous run and never
     * removed). That specific failure is expected and safely ignored;
     * anything else is a real problem and should propagate.
     */
    private void ensureConsumerGroupExists() {
        try {
            streamOps.createGroup(streamKey, ReadOffset.from("0"), consumerGroup);
            log.info("Created consumer group '{}' on stream '{}'", consumerGroup, streamKey);
        } catch (RedisSystemException ex) {
            String causeMessage = ex.getCause() != null ? ex.getCause().getMessage() : null;
            if (causeMessage != null && causeMessage.contains("BUSYGROUP")) {
                log.debug("Consumer group '{}' already exists on stream '{}'", consumerGroup, streamKey);
            } else {
                throw ex;
            }
        }
    }

    @Override
    public void run() {
        Consumer consumer = Consumer.from(consumerGroup, consumerName);
        StreamReadOptions readOptions = StreamReadOptions.empty().count(50).block(Duration.ofSeconds(2));

        while (running.get()) {
            try {
                List<MapRecord<String, String, String>> records = streamOps.read(
                        consumer, readOptions, StreamOffset.create(streamKey, ReadOffset.lastConsumed()));

                if (records == null) {
                    continue;
                }

                for (MapRecord<String, String, String> record : records) {
                    try {
                        handleRecord(record);
                        streamOps.acknowledge(consumerGroup, record);
                    } catch (Exception ex) {
                        log.error("Failed to handle record {} from stream '{}': {}",
                                record.getId(), streamKey, ex.getMessage(), ex);
                    }
                }
            } catch (Exception ex) {
                if (running.get()) {
                    log.error("Error reading from stream '{}': {}", streamKey, ex.getMessage(), ex);
                }
            }
        }
    }

    /**
     * Handle one stream record. Must be idempotent - see the class-level
     * delivery-semantics note.
     */
    protected abstract void handleRecord(MapRecord<String, String, String> record);
}
