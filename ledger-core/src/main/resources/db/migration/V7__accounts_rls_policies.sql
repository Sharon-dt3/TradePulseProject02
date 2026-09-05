-- Phase 2: RLS policies for accounts. Three separate PERMISSIVE policies
-- on SELECT rather than one big OR'd expression — Postgres automatically
-- ORs multiple permissive policies together for the same command, so each
-- one here reads as a single independent rule (own / granted / any),
-- rather than one expression that has to be parsed as a whole to see
-- what it allows.
--
-- No role_permissions entry exists specifically named "accounts.read.*";
-- positions.read.own / positions.read.any / positions.read.granted (V3)
-- are reused here, since account balance is treated as position-adjacent
-- data. Revisit in a later migration if ImplementationPlan.md specifies
-- a distinct accounts permission.
--
-- Deliberately no FORCE ROW LEVEL SECURITY: ledger-core's own JDBC
-- connection runs as the table owner (postgres) and never sets
-- request.jwt.claims (that only exists inside Supabase's own
-- PostgREST/Auth request context), so every policy below would
-- evaluate auth.jwt() as null and reject even ledger-core's own,
-- already-ownership-checked queries. Plain ENABLE ROW LEVEL SECURITY
-- (from V2) already exempts the table owner while still blocking any
-- other non-superuser role (e.g. "authenticated", used by Supabase's
-- client-side API) — which is the actual defense-in-depth target here.

create policy accounts_select_own
  on public.accounts
  for select
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub')::uuid);

create policy accounts_select_granted
  on public.accounts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.account_grants g
      where g.account_id = accounts.id
        and g.granted_to_user_id = (auth.jwt() ->> 'sub')::uuid
        and g.expires_at > now()
    )
  );

create policy accounts_select_any
  on public.accounts
  for select
  to authenticated
  using (public.authorize('positions.read.any'));
