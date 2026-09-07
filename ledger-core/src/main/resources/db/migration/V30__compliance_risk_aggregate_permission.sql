-- Phase 14 item 4: Compliance-scoped risk read. Reuses the existing
-- risk.aggregate.read permission (V3, currently held by risk_manager
-- and admin) rather than introducing a new risk.read.all/similar
-- permission - same reuse-over-new-permission decision this codebase
-- already made for V7 (account-read) and Phase 18 item 3
-- (audit.read.any). GET /risk/aggregate (risk-engine) already gates
-- purely on risk.aggregate.read via require_permission - no risk-engine
-- code changes needed, this migration alone is the entire item.
INSERT INTO role_permissions (role, permission) VALUES
    ('compliance', 'risk.aggregate.read');
