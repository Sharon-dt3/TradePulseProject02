-- Phase 12: a trader can cancel their own WORKING order via
-- POST /orders/{orderId}/cancel. Seeded the same way V3__rbac_seed.sql
-- seeds every other permission - data, not hardcoded in application code.

INSERT INTO role_permissions (role, permission) VALUES
    ('trader', 'orders.cancel.own');
