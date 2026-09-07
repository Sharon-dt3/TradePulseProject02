-- Phase 13 items 2+3: permissions gating granted-account reads (the
-- Delegated Viewer / Support side of AccountAccessService). positions.read.granted
-- was already seeded for both roles back in V3 - only account/trades/orders
-- are new here. Auditor is deliberately not seeded despite
-- account_grants.purpose allowing 'auditor' as a value - Auditor's granted
-- access uses audit_engagements' date-range model instead (Phase 16), a
-- different mechanism. Named with the codebase's already-established
-- plural vocabulary (trades./orders.) rather than the planning doc's
-- singular wording, for consistency with V21-V25.
INSERT INTO role_permissions (role, permission) VALUES
    ('delegated_viewer', 'account.read.granted'),
    ('delegated_viewer', 'trades.read.granted'),
    ('delegated_viewer', 'orders.read.granted'),
    ('support',          'account.read.granted'),
    ('support',          'trades.read.granted'),
    ('support',          'orders.read.granted');
