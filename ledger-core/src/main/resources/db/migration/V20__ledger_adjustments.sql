CREATE TABLE ledger_adjustments (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   uuid NOT NULL REFERENCES accounts (id),
    proposed_by  uuid NOT NULL REFERENCES auth.users (id),
    approved_by  uuid REFERENCES auth.users (id),
    amount       numeric(19,4) NOT NULL,
    reason       text NOT NULL,
    status       text NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'APPROVED')),
    proposed_at  timestamptz NOT NULL DEFAULT now(),
    approved_at  timestamptz,
    -- Phase 10 dual control: the real four-eyes enforcement. NULL
    -- approved_by (still-PROPOSED rows) passes this check, since a NULL
    -- comparison is neither true nor false, not a CHECK violation - only
    -- an actual self-approval attempt (both columns set to the same id)
    -- ever fails it.
    CONSTRAINT ledger_adjustments_dual_control CHECK (proposed_by <> approved_by)
);
CREATE INDEX idx_ledger_adjustments_account_id ON ledger_adjustments (account_id);
ALTER TABLE ledger_adjustments ENABLE ROW LEVEL SECURITY;

-- journal_entries previously assumed every entry originated from a
-- trade (trade_id NOT NULL). An admin adjustment isn't a trade, so this
-- widens the table to accept either source, with a CHECK enforcing
-- exactly one is ever set - never both, never neither.
ALTER TABLE journal_entries ALTER COLUMN trade_id DROP NOT NULL;
ALTER TABLE journal_entries ADD COLUMN adjustment_id uuid REFERENCES ledger_adjustments (id);
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_exactly_one_source CHECK (
    (trade_id IS NOT NULL AND adjustment_id IS NULL) OR
    (trade_id IS NULL AND adjustment_id IS NOT NULL)
);
