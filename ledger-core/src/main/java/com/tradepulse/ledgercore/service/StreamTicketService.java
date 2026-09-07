package com.tradepulse.ledgercore.service;

import java.time.Duration;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradepulse.ledgercore.repository.AccountRepository;

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
 *
 * Cross-cutting integration check step 10: the ticket's value also
 * carries accountId (not just userId) - risk.updates events key off
 * accountId, and gateway has no Postgres access to look that mapping
 * up itself (BLUEPRINT.md restricts DB credentials to ledger-core and
 * risk-engine only). A user with no trading account of their own
 * (e.g. an admin/compliance-only login) gets accountId: null - their
 * connection stays open for the connected/heartbeat frames but never
 * matches a risk.updates entry, which is correct, not an error.
 */
@Service
public class StreamTicketService {

    private static final String KEY_PREFIX = "sse:ticket:";

    private final StringRedisTemplate redisTemplate;
    private final AccountRepository accountRepository;
    private final ObjectMapper objectMapper;
    private final long ticketTtlSeconds;

    public StreamTicketService(
            StringRedisTemplate redisTemplate,
            AccountRepository accountRepository,
            ObjectMapper objectMapper,
            @Value("${ledger.sse.ticket-ttl-seconds}") long ticketTtlSeconds) {
        this.redisTemplate = redisTemplate;
        this.accountRepository = accountRepository;
        this.objectMapper = objectMapper;
        this.ticketTtlSeconds = ticketTtlSeconds;
    }

    /**
     * Mints a new opaque ticket for userId and stores {userId, accountId}
     * as JSON in Redis with a short TTL. The gateway trusts this payload
     * as-is once GETDEL finds it, the same way it already trusts a JWT's
     * verified subject claim.
     */
    public String issueTicket(UUID userId) {
        String ticket = UUID.randomUUID().toString();
        String accountId = accountRepository.findByUserId(userId)
                .map(account -> account.getId().toString())
                .orElse(null);

        String payload;
        try {
            payload = objectMapper.writeValueAsString(new TicketPayload(userId.toString(), accountId));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize SSE ticket payload", ex);
        }

        redisTemplate.opsForValue().set(
                KEY_PREFIX + ticket,
                payload,
                Duration.ofSeconds(ticketTtlSeconds));
        return ticket;
    }

    private record TicketPayload(String userId, String accountId) {
    }
}
