-- Phase 2: RBAC data model.
--
-- user_roles: a user can hold more than one role at once (e.g. trader +
-- compliance), so this is a plain many-to-many table, not one role per user.
CREATE TABLE user_roles (
    user_id     uuid NOT NULL REFERENCES auth.users(id),
    role        text NOT NULL CHECK (role IN (
                    'trader', 'viewer', 'delegated_viewer', 'compliance',
                    'risk_manager', 'admin', 'support', 'auditor'
                )),
    granted_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- role_permissions: the fixed lookup table mapping each role to what it's
-- allowed to do. Permission strings are seeded in V3, not here — DDL and
-- seed data stay separate.
CREATE TABLE role_permissions (
    role        text NOT NULL,
    permission  text NOT NULL,
    PRIMARY KEY (role, permission)
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- account_grants: time-boxed, reasoned access to someone else's account —
-- this is what lets a Delegated Viewer, Support agent, or Auditor see an
-- account they don't own, without weakening the "own account only" rule
-- everyone else is bound by. reason is mandatory: every one of today's
-- three grant purposes requires a documented reason, by design.
CREATE TABLE account_grants (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id          uuid NOT NULL REFERENCES accounts(id),
    granted_to_user_id  uuid NOT NULL REFERENCES auth.users(id),
    purpose             text NOT NULL CHECK (purpose IN (
                            'delegated_viewer', 'support', 'auditor'
                        )),
    reason              text NOT NULL,
    expires_at          timestamptz NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE account_grants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_account_grants_lookup
    ON account_grants (granted_to_user_id, account_id, expires_at);