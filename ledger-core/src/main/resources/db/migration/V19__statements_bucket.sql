-- Phase 9: private statements bucket. Never public — the only way to
-- reach an object here is an authenticated request that passes Storage
-- RLS below.
INSERT INTO storage.buckets (id, name, public)
VALUES ('statements', 'statements', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: statements/{user_id}/{account_id}/{date}.pdf. Inside
-- a bucket, storage.objects.name holds the path WITHIN the bucket (the
-- bucket_id column already says "statements"), so a stored object's name
-- is "{user_id}/{account_id}/{date}.pdf" — storage.foldername(name)[1]
-- is exactly the {user_id} segment.
--
-- SELECT only, and only for the caller's own {user_id} segment.
-- Deliberately no INSERT/UPDATE/DELETE policy for "authenticated" at
-- all — ledger-core uploads statements using the service_role key,
-- which bypasses Storage RLS the same way its own Postgres JDBC
-- connection already bypasses table RLS (see V7's comment on why FORCE
-- ROW LEVEL SECURITY is absent there). Deny-by-default on every write
-- path is what makes "generation happens server-side only" true at the
-- infrastructure level, not just by convention nobody enforces.
CREATE POLICY statements_select_own
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'statements'
    AND (storage.foldername(name))[1] = (auth.uid())::text
);
