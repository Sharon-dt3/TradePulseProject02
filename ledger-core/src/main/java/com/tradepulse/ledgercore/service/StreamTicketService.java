package com.tradepulse.ledgercore.service;

import java.time.Duration;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Phase 10: issues short-lived, single-use SSE stream tickets
 * (BLUEPRINT.md's "SSE auth" - EventSource can't set headers, so raw
 * JWTs never go in the SSE URL). ledger-core owns the auth boundary
 * here: it mints the ticket; the gateway only ever consumes one, never
 * mints or verifies a JWT itself for SSE (BLUEPRINT.md's "no parallel
 * auth-minting on the Go side").
 *
 * Backed by Redis rather than Postgres because the gateway already
 * needs direct Redis access anyway (it fans out the risk.updates
 * stream), so ticket validation reuses that connection instead of
 * requiring a new internal HTTP call between gateway and ledger-core,
 * or handing the gateway Postgres credentials it has no other reason
 * to hold (BLUEPRINT.md: only ledger-core and risk-engine hold
 * Postgres credentials).
 *
 * Single-use is enforced by the *consumption* side (the gateway's
 * atomic GETDEL), not here - issuing a ticket only ever writes it.
 */
@Service
public class StreamTicketService {

    private static final String KEY_PREFIX = "sse:ticket:";

    private final StringRedisTemplate redisTemplate;
    private final long ticketTtlSeconds;

    public StreamTicketService(
            StringRedisTemplate redisTemplate,
            @Value("${ledger.sse.ticket-ttl-seconds}") long ticketTtlSeconds) {
        this.redisTemplate = redisTemplate;
        this.ticketTtlSeconds = ticketTtlSeconds;
    }

    /**
     * Mints a new opaque ticket for userId and stores it in Redis with
     * a short TTL. The value is the plain user id string - the gateway
     * trusts it as-is once GETDEL finds it, the same way it already
     * trusts a JWT's verified subject claim.
     */
    public String issueTicket(UUID userId) {
        String ticket = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(
                KEY_PREFIX + ticket,
                userId.toString(),
                Duration.ofSeconds(ticketTtlSeconds));
        return ticket;
    }
}
