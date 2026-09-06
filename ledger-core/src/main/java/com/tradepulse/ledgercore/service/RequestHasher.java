package com.tradepulse.ledgercore.service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.UUID;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.tradepulse.ledgercore.domain.Order;
import com.tradepulse.ledgercore.domain.Trade;

/**
 * Phase 5: computes the SHA-256 request_hash stored on Order.requestHash.
 *
 * Hashed over accountId, symbol, side, orderType, quantity, and (Phase 8)
 * limitPrice when present — deliberately excludes requestId (it's the
 * lookup key, not part of what's being verified unchanged) and any
 * timestamp. expiresAt is a timestamp in substance even though it's
 * client-suppliable: a client retrying the same logical LIMIT order might
 * compute "now + 24h" freshly on each attempt, so including it would make
 * a legitimate retry look like a changed order. limitPrice has no such
 * problem — it's a fixed economic term of the order, not derived from
 * "now" — so it's included, but only when present (a MARKET order never
 * carries one, and omitting the key entirely rather than hashing a null
 * keeps a MARKET order's hash shape identical to before Phase 8).
 *
 * Canonical form is a JSON object built from a TreeMap (guarantees
 * alphabetically sorted keys, so the same logical order always
 * serializes to the exact same string regardless of field order in
 * code) with numeric fields' BigDecimal scale normalized first via
 * stripTrailingZeros — without that, "10.0" and "10.00" are equal
 * numerically but produce different JSON text and therefore different
 * hashes, which would let a client "change" an order by only altering
 * how a value is formatted, not its actual value.
 *
 * A plain stateless utility class (not a Spring bean) — no configuration
 * or dependency it needs justifies dependency injection here.
 */
public final class RequestHasher {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private RequestHasher() {
    }

    public static String hash(UUID accountId, String symbol, Trade.Side side,
                               Order.OrderType orderType, BigDecimal quantity, BigDecimal limitPrice) {
        SortedMap<String, String> canonical = new TreeMap<>();
        canonical.put("accountId", accountId.toString());
        canonical.put("symbol", symbol);
        canonical.put("side", side.name());
        canonical.put("orderType", orderType.name());
        canonical.put("quantity", normalizeScale(quantity));
        if (limitPrice != null) {
            canonical.put("limitPrice", normalizeScale(limitPrice));
        }

        try {
            String json = OBJECT_MAPPER.writeValueAsString(canonical);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            // Neither failure is something a caller can meaningfully
            // recover from - a broken JSON serializer or a JVM missing
            // SHA-256 both indicate something is very wrong with the
            // runtime itself, not with this particular request.
            throw new IllegalStateException("Failed to compute request hash", e);
        }
    }

    private static String normalizeScale(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        if (stripped.scale() < 0) {
            stripped = stripped.setScale(0);
        }
        return stripped.toPlainString();
    }
}
