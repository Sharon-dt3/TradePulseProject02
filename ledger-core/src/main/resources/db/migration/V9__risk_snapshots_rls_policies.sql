-- Phase 2: RLS policies for risk_snapshots. Same shape as accounts (V7):
-- self-owned OR granted-and-unexpired OR authorize('...read.any') — but
-- risk_snapshots is keyed by account_id, not user_id directly, so "own"
-- and "granted" both need a join back to accounts / account_grants
-- rather than a direct column comparison.
--
-- Unlike accounts, a real permission already exists for the "any" case:
-- risk.aggregate.read (seeded in V3, held by risk_manager and admin).
-- risk_manager deliberately does NOT hold positions.read.any (V3's
-- comment: least-privilege — a risk manager aggregates risk, they don't
-- browse individual positions), so reusing positions.read.any here would
-- either wrongly exclude risk_manager or wrongly require expanding their
-- permissions just to fit this table. risk.aggregate.read is the correct,
-- narrower fit.
--
-- Both subqueries below (against accounts and account_grants) run as the
-- actual caller, same as accounts_select_granted's did — but this time
-- there's no repeat of the V7/V8 bug: the exact conditions here
-- (a.user_id = sub; g.granted_to_user_id = sub) already match existing
-- policies on those tables (accounts_select_own from V7, and
-- account_grants_select_own from V8), so the rows these subqueries need
-- are already visible to the caller under those tables' own RLS.
--
-- No FORCE ROW LEVEL SECURITY, same reasoning as V7: risk-engine's own
-- DATABASE_URL connects as the postgres role (confirmed — its pooler
-- connection string "postgres.<project-ref>" is Supabase's pooler
-- routing convention, not a distinct Postgres role), so it already
-- bypasses RLS as table owner without needing FORCE, and never sets
-- request.jwt.claims on its own raw queries.

create policy risk_snapshots_select_own
  on public.risk_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.accounts a
      where a.id = risk_snapshots.account_id
        and a.user_id = (auth.jwt() ->> 'sub')::uuid
    )
  );

create policy risk_snapshots_select_granted
  on public.risk_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.account_grants g
      where g.account_id = risk_snapshots.account_id
        and g.granted_to_user_id = (auth.jwt() ->> 'sub')::uuid
        and g.expires_at > now()
    )
  );

create policy risk_snapshots_select_any
  on public.risk_snapshots
  for select
  to authenticated
  using (public.authorize('risk.aggregate.read'));
