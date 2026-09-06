-- Phase 5: idempotency for POST /orders. request_id is a client-generated
-- UUID identifying one logical order attempt; request_hash is a SHA-256
-- over the order's meaningful fields (see the hashing utility's javadoc
-- for exactly which ones and why), computed once when the order is first
-- created and never recomputed afterward.
--
-- Both columns live directly on "orders" rather than a separate
-- idempotency_keys table - BLUEPRINT.md §3's data model already specifies
-- this shape (V11's "unsettled" comment predates that section being
-- pinned down).
--
-- request_id is nullable at the column level only because Postgres
-- doesn't have a clean way to backfill a meaningful value for pre-Phase-5
-- rows (none of which had a client-supplied request_id at all) - every
-- order created by OrderServiceImpl from this phase forward always sets
-- it; the application layer enforces "always present for new rows", not
-- the schema.
--
-- The unique index is the actual duplicate-prevention mechanism: even if
-- two requests with the same request_id both pass the application-level
-- "does this already exist" check at nearly the same instant (a genuine
-- race, not just a hypothetical), Postgres itself refuses the second
-- INSERT. See Phase 5's discussion for why that's sufficient to prevent
-- an actual duplicate trade, even though the resulting error path isn't
-- as polished as the clean 409 the application-level check produces.

ALTER TABLE orders ADD COLUMN request_id uuid;
ALTER TABLE orders ADD COLUMN request_hash text;
CREATE UNIQUE INDEX idx_orders_account_request_id ON orders (account_id, request_id);