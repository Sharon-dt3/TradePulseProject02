-- Phase 2: the single permission check every RLS policy will call.
--
-- auth.jwt() is a Supabase-provided helper that returns the current
-- request's JWT claims as jsonb. user_role (injected by the claim hook
-- in V4/V5) is a JSON array, since a user can hold more than one role,
-- so this checks array membership against role_permissions rather than
-- equality against a single role string.
--
-- SECURITY DEFINER for the same reason as the claim hook: role_permissions
-- has RLS enabled with zero policies (V2), so a normal RLS-restricted
-- caller (e.g. "authenticated") could not read it directly. Running as
-- the function owner bypasses that, exactly like V5's fix. search_path
-- is pinned for the same hijack-prevention reason.

create or replace function public.authorize(requested_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  user_roles_claim jsonb;
  has_permission boolean;
begin
  user_roles_claim := coalesce(auth.jwt() -> 'user_role', '[]'::jsonb);

  select exists (
    select 1
    from public.role_permissions rp
    where rp.permission = requested_permission
      and rp.role in (select jsonb_array_elements_text(user_roles_claim))
  ) into has_permission;

  return has_permission;
end;
$$;

grant execute
  on function public.authorize(text)
  to authenticated;
