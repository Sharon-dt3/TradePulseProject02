-- Phase 13, item 1: Viewer reads its own data. Also closes a pre-existing
-- gap where placeOrder/listOrders had no permission check at all (any
-- authenticated user, any role, could place or list orders) - discovered
-- while wiring Viewer onto the same "own" read surface Trader already has.
INSERT INTO role_permissions (role, permission) VALUES
    ('trader', 'account.read.own'),
    ('trader', 'orders.read.own'),
    ('viewer', 'account.read.own'),
    ('viewer', 'orders.read.own'),
    ('viewer', 'trades.read.own'),
    ('viewer', 'ledger.transactions.read.own');
