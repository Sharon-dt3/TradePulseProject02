-- Phase 14 item 3: Compliance gets unconditional ("any") read access to
-- every account, its trades, and its orders - no ownership and no
-- account_grants row needed, resolved via AccountAccessService's new
-- anyPermission overload. positions.read.any already exists (V3, seeded
-- to compliance+admin) and was dormant until this phase wired it into
-- PortfolioServiceImpl; account.read.any/trades.read.any/orders.read.any
-- are net new here, following the same plural-resource + scope-suffix
-- convention already established by *.read.own/*.read.granted, rather
-- than the plan's original "trade.read.all"/"order.read.all" wording.
INSERT INTO role_permissions (role, permission) VALUES
    ('compliance', 'account.read.any'),
    ('compliance', 'trades.read.any'),
    ('compliance', 'orders.read.any');
