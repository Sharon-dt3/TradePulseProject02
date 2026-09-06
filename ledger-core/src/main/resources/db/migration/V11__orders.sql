-- Phase 3: orders table, plus the trades.order_id FK V10 deliberately
-- deferred (see that migration's comment) because orders didn't exist yet.
--
-- Columns are scoped to what Phase 3 actually needs, not the full column
-- list BLUEPRINT.md §3 sketches for the order lifecycle end-to-end:
--   - status's CHECK includes all seven values from BLUEPRINT.md/
--     IMPLEMENTATION_PLAN.md Phase 3 up front, since that enum is spec'd
--     as a whole rather than phased in.
--   - order_type's CHECK is MARKET-only for now. LIMIT support (and the
--     limit_price / expires_at columns it needs) lands via ALTER TABLE in
--     Phase 8, once WORKING-state scanning exists to actually use them -
--     adding unused columns now would just be guessing Phase 8's shape
--     early.
--   - request_id / request_hash (Phase 5 idempotency) are left out for the
--     same reason: BLUEPRINT.md §7 OD-2 / Phase 5's own checklist haven't
--     settled whether the hash lives on trades or a separate
--     idempotency_keys table, so adding columns here would preempt that
--     decision.
--
-- rejection_reason is NOT a column here either - a rejected order's reason
-- (NO_MARKET/STALE_PRICE) is returned in the OrderResultDto response and
-- recorded in audit_log's jsonb details (ORDER_REJECTED), not persisted
-- redundantly on the row. See RejectionReason's javadoc.
--
-- Same RLS posture as V10: enabled immediately, no policies yet (service
-- traffic connects as the table owner and bypasses RLS; policies are a
-- later phase, mirroring accounts/trades/etc.).

CREATE TABLE orders (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   uuid NOT NULL REFERENCES accounts (id),
    symbol       text NOT NULL,
    side         text NOT NULL CHECK (side IN ('BUY', 'SELL')),
    order_type   text NOT NULL CHECK (order_type IN ('MARKET')),
    quantity     numeric(19,4) NOT NULL CHECK (quantity > 0),
    status       text NOT NULL DEFAULT 'NEW' CHECK (status IN (
                     'NEW', 'WORKING', 'FILLED', 'PARTIALLY_FILLED',
                     'CANCELLED', 'REJECTED', 'EXPIRED'
                 )),
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_account_id ON orders (account_id);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Every trade now originates from an order (MARKET fills today, LIMIT
-- fills from Phase 8 on) - BLUEPRINT.md §3 lists trades.order_id without
-- "nullable", unlike limit_price, so this is NOT NULL rather than
-- optional. Safe to add as NOT NULL directly (no DEFAULT) only because
-- this table is still empty at this point in the migration history; a
-- populated trades table would need a backfill step first.
ALTER TABLE trades ADD COLUMN order_id uuid NOT NULL REFERENCES orders (id);
CREATE INDEX idx_trades_order_id ON trades (order_id);
