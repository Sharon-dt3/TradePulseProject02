-- Phase 9: Risk Manager firm-wide aggregate. A live view for now, per the
-- checklist's own note — a materialized view (refreshed on a schedule,
-- or incrementally) is a later optimization once real query volume
-- justifies it, not something to build ahead of need.
--
-- Same signed-quantity convention as TradeRepository.currentPosition
-- (BUY = +quantity, SELL = -quantity), just aggregated across every
-- account instead of one — this is firm-wide net notional exposure per
-- symbol, not any single account's position.
--
-- Access control here can't be row-level RLS the way accounts/trades use
-- it elsewhere: trades currently has exactly one read policy
-- (trades_select_auditor_scoped, V17), and a Risk Manager holds no
-- audit_engagements — if this view ran under the caller's own identity,
-- RLS would silently filter it down to nothing. Instead this view stays
-- owned by the migration role (same as every other object in this
-- schema), so its query sees every trade regardless of ownership, and
-- access is gated the same way risk_snapshots_select_any (V9) already
-- gates account-level aggregate access: an authorize('risk.aggregate.read')
-- check (seeded for risk_manager/admin in V3) embedded directly in the
-- WHERE clause. Since that check doesn't depend on any trade column, it
-- either passes every row or none — an unauthorized caller gets zero
-- rows back, never a misleading all-zero aggregate.
CREATE VIEW risk_symbol_exposure AS
SELECT
    symbol,
    SUM(
        CASE WHEN side = 'BUY' THEN quantity ELSE -quantity END * price
    ) AS net_exposure
FROM trades
WHERE public.authorize('risk.aggregate.read')
GROUP BY symbol;

GRANT SELECT ON public.risk_symbol_exposure TO authenticated;
