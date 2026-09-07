-- Phase 12: a trader can read live per-symbol prices via
-- GET /market/prices, replacing the old unauthenticated-by-role
-- /internal/prices debug endpoint (any authenticated user could hit it,
-- regardless of role) with a permission-gated one.

INSERT INTO role_permissions (role, permission) VALUES
    ('trader', 'market.read');
