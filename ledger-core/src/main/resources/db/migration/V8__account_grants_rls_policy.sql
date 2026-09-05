-- Phase 2 fix: accounts_select_granted (V7) always evaluated to false.
-- Root cause: its EXISTS subquery reads account_grants, which also has
-- RLS enabled with zero policies (V2) — the same "deny everyone" trap
-- the claim hook hit in V4/V5, just on a different table. This time the
-- read happens as a plain expression inside another table's policy, not
-- inside a SECURITY DEFINER function, so it runs as the actual caller
-- (authenticated) and is blocked outright regardless of real data.
--
-- Unlike the claim hook, the fix here is NOT SECURITY DEFINER — that
-- would let any authenticated user read every row of account_grants
-- (everyone's delegated-access history), which is far more than
-- necessary. Instead: a narrow, self-scoped SELECT policy — a user may
-- see grants made TO them, nothing else. That's exactly the visibility
-- accounts_select_granted's subquery needs.

create policy account_grants_select_own
  on public.account_grants
  for select
  to authenticated
  using (granted_to_user_id = (auth.jwt() ->> 'sub')::uuid);
