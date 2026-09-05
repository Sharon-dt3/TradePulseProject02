-- Phase 2: permission vocabulary, seeded as data — not hardcoded in
-- application code, so a permission change is a data change, not a
-- redeploy. See ImplementationPlan.md Phase 2 for the exact mapping
-- rationale (not specified in Blueprint.md itself — a deliberate design
-- choice made here).

INSERT INTO role_permissions (role, permission) VALUES
    ('trader',           'orders.create'),
    ('trader',           'positions.read.own'),
    ('viewer',           'positions.read.own'),
    ('delegated_viewer', 'positions.read.granted'),
    ('support',          'positions.read.granted'),
    ('auditor',          'positions.read.any'),
    ('auditor',          'audit.read.any'),
    ('compliance',       'positions.read.any'),
    ('compliance',       'audit.read.any'),
    ('compliance',       'compliance.rules.write'),
    ('compliance',       'compliance.case.write'),
    ('compliance',       'accounts.freeze'),
    ('risk_manager',     'risk.aggregate.read'),
    ('admin',            'users.provision'),
    ('admin',            'accounts.freeze'),
    ('admin',            'ledger.adjustment.propose'),
    ('admin',            'ledger.adjustment.approve'),
    ('admin',            'positions.read.any'),
    ('admin',            'audit.read.any'),
    ('admin',            'compliance.rules.write'),
    ('admin',            'compliance.case.write'),
    ('admin',            'risk.aggregate.read');
