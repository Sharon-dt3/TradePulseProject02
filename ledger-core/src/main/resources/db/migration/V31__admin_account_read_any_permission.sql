-- Phase 20 prerequisite: Admin can already freeze/unfreeze any account
-- (accounts.freeze, V3) but was never seeded account.read.any (only
-- compliance got that in V29/Phase 14 item 3), so an Admin dashboard
-- reading account details before acting on one would 404. Same
-- permission, same AccountAccessService any-tier - no code change,
-- just extending who already holds the permission that tier checks.
INSERT INTO role_permissions (role, permission) VALUES
    ('admin', 'account.read.any');
