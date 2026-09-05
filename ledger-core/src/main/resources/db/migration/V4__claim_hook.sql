-- Phase 2: Custom Access Token Hook.
--
-- Supabase's GoTrue auth service calls this function every time it issues
-- a JWT, letting it inject the "user_role" claim (never Supabase-reserved
-- "role") based on this user's row(s) in user_roles. Additive only: it
-- reads the existing claims object and adds one key, never removing or
-- replacing anything else already present.
--
-- A user can hold more than one role (user_roles is many-to-many), so
-- user_role is injected as a JSON array, not a single scalar string —
-- authorize() (built next) checks array membership, not equality.
--
-- No SECURITY DEFINER: Supabase's platform already runs GoTrue as
-- supabase_auth_admin with BYPASSRLS, so an explicit GRANT is what lets
-- it see every user's roles regardless of user_roles' own RLS policies
-- (which stay scoped to normal request-time callers, not auth internals).
-- Matches the exact GRANT/REVOKE shape from Supabase's own documented
-- examples.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
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

grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon, public;

grant all
  on table public.user_roles
  to supabase_auth_admin;

revoke all
  on table public.user_roles
  from authenticated, anon, public;