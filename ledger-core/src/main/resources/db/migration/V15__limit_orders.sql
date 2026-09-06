-- Phase 8: LIMIT orders, WORKING state.
--
-- V11 scoped order_type's CHECK to MARKET-only and left limit_price/
-- expires_at out entirely, deferring both to "once WORKING-state scanning
-- exists to actually use them" (see V11's own comment) - that's now.
--
-- limit_price is NULL for MARKET orders and NOT NULL for LIMIT orders;
-- the CHECK below ties the two columns together so the database itself
-- rejects a LIMIT order with no limit_price (or a MARKET order carrying
-- one), rather than relying on application code alone to keep that
-- invariant.
--
-- expires_at is nullable at the column level (MARKET orders never carry
-- one), but OrderServiceImpl always stamps a real value on every LIMIT
-- order - either the client's requested expiresAt or a server default -
-- so in practice every WORKING row has a real expiry for the sweep to
-- act on.
--
-- idx_orders_symbol_status supports the per-tick WORKING-order scan
-- (WHERE symbol = ? AND status = 'WORKING'), which runs once per tick
-- per symbol rather than once per order.

ALTER TABLE orders DROP CONSTRAINT orders_order_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check
    CHECK (order_type IN ('MARKET', 'LIMIT'));

ALTER TABLE orders ADD COLUMN limit_price numeric(19,4) NULL
    CHECK (limit_price IS NULL OR limit_price > 0);
ALTER TABLE orders ADD COLUMN expires_at timestamptz NULL;

ALTER TABLE orders ADD CONSTRAINT orders_limit_price_matches_type CHECK (
    (order_type = 'MARKET' AND limit_price IS NULL) OR
    (order_type = 'LIMIT' AND limit_price IS NOT NULL)
);

CREATE INDEX idx_orders_symbol_status ON orders (symbol, status);
