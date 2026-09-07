-- Phase 12: a trader can list the underlying journal (trades, fees,
-- adjustments) for their own account via GET /ledger/transactions,
-- gated by a new ledger.transactions.read.own permission.

INSERT INTO role_permissions (role, permission) VALUES
    ('trader', 'ledger.transactions.read.own');
