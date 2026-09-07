-- Phase 18 item 2: Admin issues account_grants (Delegated Viewer,
-- Support) and audit_engagements (Auditor). Two separate permissions,
-- not one, since the two write paths are genuinely different models
-- (see AccountGrantService/AuditEngagementService javadocs) and a
-- future role might reasonably need one without the other.
INSERT INTO role_permissions (role, permission) VALUES
    ('admin', 'account.grant.manage'),
    ('admin', 'audit.engagement.manage');
