-- Phase 9: compliance_cases table. Compliance (or admin) opens a case
-- against an account and later closes it; both actions are audit-logged
-- via the existing generic audit_log table (entity_type =
-- 'compliance_case'), the same mechanism trades/orders already use —
-- no new audit machinery needed for this table.
--
-- reason is mandatory on open, mirroring account_grants' philosophy that
-- every one of these sensitive, delegated-access-adjacent actions needs a
-- documented reason. closed_by/closed_at stay nullable until the case is
-- actually closed.
--
-- RLS is enabled immediately with no policies yet (same deny-by-default
-- posture as every other table in this project) — read/write access is
-- mediated by ledger-core's own authorize()-checked service layer
-- (compliance.case.write, already seeded in V3 for compliance/admin), not
-- by client-direct Supabase queries, so no policy is needed here yet.
CREATE TABLE compliance_cases (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   uuid NOT NULL REFERENCES accounts (id),
    opened_by    uuid NOT NULL REFERENCES auth.users (id),
    status       text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    reason       text NOT NULL,
    opened_at    timestamptz NOT NULL DEFAULT now(),
    closed_by    uuid REFERENCES auth.users (id),
    closed_at    timestamptz
);
CREATE INDEX idx_compliance_cases_account_id ON compliance_cases (account_id);
ALTER TABLE compliance_cases ENABLE ROW LEVEL SECURITY;
