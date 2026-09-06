-- Phase 3: core ledger tables for LedgerService.postTrade.
-- Per V1's forward-reference comment and BLUEPRINT.md §3, this migration
-- owns trades, journal_entries, journal_lines, audit_log, and outbox.
-- trades.order_id (and its FK to orders) is deliberately NOT added here —
-- the orders table doesn't exist until the next migration, which will
-- ALTER TABLE trades to add that column once orders exists.
--
-- RLS is enabled on every table below immediately (deny-by-default, same
-- posture as accounts in V1) but no policies are added yet: read policies
-- need an authorize() permission string decision (mirroring V9's
-- risk.aggregate.read choice) that hasn't been made yet, so for now only
-- service_role (which bypasses RLS) can read/write these tables.

CREATE TABLE trades (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   uuid NOT NULL REFERENCES accounts (id),
    symbol       text NOT NULL,
    side         text NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity     numeric(19,4) NOT NULL,
    price        numeric(19,4) NOT NULL,
    executed_at  timestamptz NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trades_account_id ON trades (account_id);
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE TABLE journal_entries (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id     uuid NOT NULL REFERENCES trades (id),
    description  text,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_journal_entries_trade_id ON journal_entries (trade_id);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- amount is signed: positive = credit to the account's cash_balance,
-- negative = debit. A trade's journal_lines must net to the same delta
-- postTrade applies to accounts.cash_balance directly - enforced in
-- application code (LedgerService.postTrade), not a DB constraint, since
-- Postgres CHECK constraints can't see sibling rows.
CREATE TABLE journal_lines (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id   uuid NOT NULL REFERENCES journal_entries (id),
    account_id         uuid NOT NULL REFERENCES accounts (id),
    amount             numeric(19,4) NOT NULL,
    created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_journal_lines_journal_entry_id ON journal_lines (journal_entry_id);
CREATE INDEX idx_journal_lines_account_id ON journal_lines (account_id);
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

-- actor_user_id is nullable: system-initiated actions (e.g. a scheduled
-- job) have no human actor.
CREATE TABLE audit_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id   uuid REFERENCES auth.users (id),
    action          text NOT NULL,
    entity_type     text NOT NULL,
    entity_id       uuid NOT NULL,
    details         jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- published_at is nullable and set only once OutboxRelay successfully
-- XADDs this row to its Redis stream. Left null (never deleted) on
-- publish failure so the relay's next poll retries it - a delete-after-
-- publish design would lose the row if the process crashed between the
-- XADD and the delete.
CREATE TABLE outbox (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type text NOT NULL,
    aggregate_id   uuid NOT NULL,
    event_type     text NOT NULL,
    payload        jsonb NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    published_at   timestamptz
);
CREATE INDEX idx_outbox_unpublished ON outbox (created_at) WHERE published_at IS NULL;
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
