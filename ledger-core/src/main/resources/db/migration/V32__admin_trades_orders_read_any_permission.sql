-- Phase 20 UI gap, found building the Admin/Compliance Accounts
-- directory: admin's V3 seed gave it positions.read.any but never
-- trades.read.any or orders.read.any (only compliance got those, in
-- V29). Admin's account-detail drill-down calls the same
-- /accounts/{accountId}/trades and /accounts/{accountId}/orders
-- endpoints compliance's identical drill-down does
-- (PortfolioServiceImpl / OrderServiceImpl, both checking the any-tier
-- via these two permission names already) - so without this, Admin's
-- Trades and Orders tabs would 403 on any account it doesn't own,
-- while Positions worked fine. Same permission-reuse pattern as V31.
INSERT INTO role_permissions (role, permission) VALUES
    ('admin', 'trades.read.any'),
    ('admin', 'orders.read.any');
