"""Phase 17: firm-wide risk aggregation for the Risk Manager role.

Composes three read-only sources into one view:
  - risk_repository.get_latest_snapshots_all_accounts - each account's
    own latest portfolio_value/var_95/volatility (already computed by
    risk_recompute_service, never recomputed here).
  - positions_repository.get_net_positions_all_accounts - net quantity
    per symbol firm-wide (see that function's own javadoc-equivalent
    for why this is net, not gross, exposure).
  - price_history_repository.get_latest_prices - values those net
    positions at the latest observed price.

totalPortfolioValue is a straight sum of every account's own
portfolio_value (cash + market value of that account's positions) —
the "sum of portfolio value" definition, not a notional-only figure.
"""
from decimal import Decimal
from typing import List

from sqlalchemy.orm import Session

from app.config import settings
from app.positions_repository import get_net_positions_all_accounts
from app.price_history_repository import get_latest_prices
from app.risk_repository import get_latest_snapshots_all_accounts


def _is_high_risk(snapshot: dict) -> bool:
    if snapshot["insufficient_history"]:
        return False
    var_95 = snapshot["var_95"]
    portfolio_value = snapshot["portfolio_value"]
    if var_95 is None or portfolio_value is None or portfolio_value == 0:
        return False
    return (var_95 / portfolio_value) > settings.risk_high_risk_var_threshold_pct


def get_firm_wide_aggregate(session: Session) -> dict:
    snapshots = get_latest_snapshots_all_accounts(session)

    by_account = []
    total_portfolio_value = Decimal("0")
    high_risk_count = 0
    for snap in snapshots:
        high_risk = _is_high_risk(snap)
        if high_risk:
            high_risk_count += 1
        total_portfolio_value += snap["portfolio_value"] or Decimal("0")
        by_account.append(
            {
                "accountId": str(snap["account_id"]),
                "portfolioValue": snap["portfolio_value"],
                "var95": snap["var_95"],
                "volatility": snap["volatility"],
                "insufficientHistory": snap["insufficient_history"],
                "highRisk": high_risk,
                "computedAt": snap["computed_at"],
            }
        )

    net_positions = get_net_positions_all_accounts(session)
    latest_prices = get_latest_prices(session)

    by_symbol = []
    for symbol, net_quantity in net_positions.items():
        price = latest_prices.get(symbol)
        notional_value = (net_quantity * price) if price is not None else None
        by_symbol.append(
            {
                "symbol": symbol,
                "netQuantity": net_quantity,
                "latestPrice": price,
                "notionalValue": notional_value,
            }
        )
    by_symbol.sort(key=lambda entry: entry["symbol"])

    return {
        "totalPortfolioValue": total_portfolio_value,
        "accountCount": len(by_account),
        "highRiskAccountCount": high_risk_count,
        "highRiskThresholdPct": settings.risk_high_risk_var_threshold_pct,
        "byAccount": by_account,
        "bySymbol": by_symbol,
    }
