-- Phase 12: a trader can list every trade their own account has ever
-- had via GET /trades, gated by a new trades.read.own permission -
-- mirrors positions.read.own (V3__rbac_seed.sql), which already covers
-- the new GET /positions endpoint without any migration needed here.

INSERT INTO role_permissions (role, permission) VALUES
    ('trader', 'trades.read.own');
