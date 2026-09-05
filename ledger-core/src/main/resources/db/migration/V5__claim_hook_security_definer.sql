-- Phase 2 fix: the claim hook was always producing an empty user_role
-- array. Root cause, confirmed by querying pg_roles: supabase_auth_admin
-- (the role GoTrue uses to call this function) has rolbypassrls = false
-- and rolsuper = false. user_roles has RLS enabled with zero policies
-- (V2), which means "deny everyone" until a policy says otherwise.
-- Without SECURITY DEFINER, the function runs as its invoker
-- (supabase_auth_admin), so its SELECT against user_roles was silently
-- blocked by RLS for every user, every time — never a data problem.
--
-- SECURITY DEFINER makes the function run as its owner instead (the
-- Flyway migration user, postgres), which owns/bypasses RLS on this
-- table. search_path is pinned explicitly, which is required alongside
-- SECURITY DEFINER: an unpinned search_path on a privileged function is
-- a well-known hijack vector (a caller-controlled schema earlier in the
-- path could shadow public.user_roles with a trojan table/view).

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claims jsonb;
  roles jsonb;
begin
  select coalesce(jsonb_agg(role), '[]'::jsonb)
    into roles
    from public.user_roles
    where user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', roles);
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;
