-- Phase 6: seeds the "house" system account that commission fees are
-- credited to. accounts.user_id is NOT NULL REFERENCES auth.users(id)
-- (V1__baseline_accounts.sql), so a fees account needs a real auth.users
-- row to point at — there's no nullable "system account" concept in the
-- schema, and this migration deliberately doesn't add one (see Phase 6's
-- design discussion for the alternatives that were considered).
--
-- The auth.users row below is never used for actual authentication: it
-- exists purely to satisfy the FK. Per information_schema.columns, "id"
-- is the only NOT NULL column on auth.users without a default, so that's
-- the only column here that isn't optional; is_sso_user/is_anonymous are
-- NOT NULL but already default to false and are set explicitly anyway
-- for clarity. Every GoTrue-specific field (aud, role, instance_id,
-- encrypted_password, etc.) is left NULL since this identity never goes
-- through Supabase's Auth API.
--
-- Both UUIDs are fixed constants (not gen_random_uuid()) so
-- ledger.house-account-id in application.yml can reference the account
-- row by a known, stable value across every environment this migration
-- runs in.
INSERT INTO auth.users (id, email, is_sso_user, is_anonymous, created_at, updated_at)
VALUES (
    'a0000000-0000-4000-8000-000000000001',
    'house-fees@system.tradepulse.internal',
    false,
    false,
    now(),
    now()
);

INSERT INTO accounts (id, user_id, cash_balance, margin_enabled, frozen, created_at)
VALUES (
    'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    0,
    false,
    false,
    now()
);
