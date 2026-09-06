-- Phase 9: Auditor date-range access. account_grants (V2) is a single
-- current-state shape — one expires_at cutoff, the same shape for all
-- three purposes (delegated_viewer/support/auditor). Auditor needs a
-- genuinely different shape: a bounded historical window (a start AND
-- an end), not an open-ended "valid until" grant. Bolting nullable
-- start/end columns onto account_grants would mean those columns are
-- meaningless for the other two purposes — a separate table keeps each
-- access model single-purpose, same as every other table in this
-- project.
--
-- reason stays mandatory, same philosophy as account_grants: every one
-- of these delegated-access rows needs a documented reason.
CREATE TABLE audit_engagements (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id        uuid NOT NULL REFERENCES accounts (id),
    auditor_user_id   uuid NOT NULL REFERENCES auth.users (id),
    reason            text NOT NULL,
    scope_start_date  date NOT NULL,
    scope_end_date    date NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_engagements_valid_range CHECK (scope_end_date >= scope_start_date)
);
CREATE INDEX idx_audit_engagements_lookup ON audit_engagements (auditor_user_id, account_id);
ALTER TABLE audit_engagements ENABLE ROW LEVEL SECURITY;

-- Self-scoped read, same reasoning as account_grants_select_own (V8): an
-- auditor may see engagements assigned TO them, nothing else.
CREATE POLICY audit_engagements_select_own
  ON public.audit_engagements
  FOR SELECT
  TO authenticated
  USING (auditor_user_id = (auth.jwt() ->> 'sub')::uuid);

-- trades has had RLS enabled with zero policies since V10 ("read
-- policies need an authorize() permission string decision that hasn't
-- been made yet"). This is its first read policy, and it's deliberately
-- narrow rather than a blanket "auditor can read any trade": an auditor
-- may read a trade only if it belongs to an account they have an active
-- engagement for, AND the trade's executed_at date falls within that
-- engagement's scope_start_date/scope_end_date. Comparing against
-- executed_at::date (not the raw timestamptz) keeps both ends of the
-- range inclusive exactly as scope_start_date/scope_end_date name them,
-- without a timezone-sensitive half-open interval to get subtly wrong.
CREATE POLICY trades_select_auditor_scoped
  ON public.trades
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_engagements ae
      WHERE ae.account_id = trades.account_id
        AND ae.auditor_user_id = (auth.jwt() ->> 'sub')::uuid
        AND trades.executed_at::date BETWEEN ae.scope_start_date AND ae.scope_end_date
    )
  );
