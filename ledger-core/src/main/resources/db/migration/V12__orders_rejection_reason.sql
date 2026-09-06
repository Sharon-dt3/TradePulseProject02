-- Phase 3 (revisited while building GET /orders): V11 deliberately did
-- NOT persist why an order was rejected - the reason was only ever
-- returned in the live POST /orders response and recorded in
-- audit_log's jsonb details. That works for the moment of rejection,
-- but a listing endpoint (GET /orders) has no way to show a PAST
-- order's rejection reason without either this column or re-deriving it
-- from audit_log's details ->> 'reason', which would couple display
-- logic to audit_log's internal JSON shape for no real benefit.
--
-- No CHECK constraint on the values here, unlike side/order_type/status
-- in V11 - BLUEPRINT.md §7 OD-2 leaves RejectionReason explicitly
-- unfrozen (Phase 4 is expected to add INSUFFICIENT_POSITION etc.), so
-- constraining this column to today's two values would freeze it at the
-- database layer while the application-level decision is still open.

ALTER TABLE orders ADD COLUMN rejection_reason text;