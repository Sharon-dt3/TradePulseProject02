-- Phase 0: ledger-core baseline.
-- Per IMPLEMENTATION_PLAN.md Phase 0, this migration seeds only what Phase 0
-- itself needs (accounts). Later phases (1, 2, 3, 6, 9, 10) each add their
-- own Flyway migration for the tables they introduce (orders, trades,
-- journal_entries/journal_lines, audit_log, outbox, account_grants,
-- user_roles, role_permissions, compliance_cases, ledger_adjustments) —
-- see BLUEPRINT.md §3 for the full data model across all phases.

CREATE TABLE accounts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES auth.users (id),
    cash_balance    numeric(19,4) NOT NULL DEFAULT 0,
    margin_enabled  boolean NOT NULL DEFAULT false,
    frozen          boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user_id ON accounts (user_id);

-- Deny-by-default: RLS is enabled the moment the table exists, even though
-- no policies exist until Phase 2's authorize()/claim-hook model lands.
-- Until then, only service_role (which bypasses RLS) can read/write this
-- table — the pooled anon/authenticated connection gets zero rows.
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
