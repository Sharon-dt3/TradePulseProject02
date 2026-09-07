-- Phase 18 item 1: Admin user listing and role assignment/removal.
INSERT INTO role_permissions (role, permission) VALUES
    ('admin', 'user.read.all'),
    ('admin', 'role.manage');
