"""Phase 7: pure risk math — no DB access, so this is unit-testable in
isolation from anything about how the data was fetched.

Zero-correlation simplification (documented per the Phase 7 checklist):
portfolio variance is the sum of each symbol's own variance weighted by
(position_value / portfolio_value)^2, with no cross-symbol covariance
term. Real covariance is explicitly deferred to Phase 11.

VaR uses the standard one-tailed 95% z-score (1.645) against portfolio
volatility and portfolio_value, with a zero-mean-return assumption —
typical for short-horizon parametric VaR, and consistent with the
checklist's formula being expressed purely in terms of variance, with no
mean-return term.
"""
import statistics
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

Z_SCORE_95 = Decimal("1.645")
YEAR_SECONDS = Decimal(365.25 * 86400)
CONFIDENCE_LEVEL = Decimal("0.95")

# A single return (2 price points) can't produce a variance under any
# standard formula without it being trivially/misleadingly zero — exactly
# the "silent zero-risk value" the insufficient_history flag exists to
# prevent. So the real floor here is 2 *returns*, i.e. 3 raw points,
# despite the Phase 7 checklist's literal wording ("fewer than two
# price-history points") — see this module's introduction in the
# conversation this was built from for the full reasoning.
MIN_POINTS_FOR_VARIANCE = 3


def _return_series(points: List[Tuple[datetime, Decimal]]) -> List[Decimal]:
    prices = [p for _, p in points]
    return [(prices[i] - prices[i - 1]) / prices[i - 1] for i in range(1, len(prices))]


class InsufficientPriceHistory(Exception):
    """Raised when a currently-held symbol has zero price_history rows at
    all — a race between the market.ticks and ledger.events consumers,
    since they're independently consumed with no ordering guarantee
    between them. Callers should let this propagate out of handle_record
    so the triggering event goes unacked and is retried once the price
    consumer has caught up, rather than writing a degraded snapshot."""


def compute_portfolio_value(
    positions: Dict[str, Decimal],
    prices_by_symbol: Dict[str, List[Tuple[datetime, Decimal]]],
    cash: Decimal,
) -> Decimal:
    market_value = Decimal("0")
    for symbol, quantity in positions.items():
        points = prices_by_symbol.get(symbol, [])
        if not points:
            raise InsufficientPriceHistory(
                f"symbol '{symbol}' is held but has zero price_history rows"
            )
        _, latest_price = points[-1]
        market_value += quantity * latest_price
    return cash + market_value


def compute_var_and_volatility(
    positions: Dict[str, Decimal],
    prices_by_symbol: Dict[str, List[Tuple[datetime, Decimal]]],
    portfolio_value: Decimal,
) -> Tuple[Optional[Decimal], Optional[Decimal], bool]:
    """Returns (var_95, volatility, insufficient_history). A zero-position
    (cash-only) account correctly returns (0, 0, False) — that's real
    zero risk, not missing data."""
    if not positions:
        return Decimal("0"), Decimal("0"), False

    if portfolio_value == 0:
        # Every weight below would divide by zero; a zero-value portfolio
        # holding nonzero positions is itself a degenerate state, not one
        # this formula can meaningfully describe.
        return None, None, True

    weighted_variance = Decimal("0")
    for symbol, quantity in positions.items():
        points = prices_by_symbol.get(symbol, [])
        if len(points) < MIN_POINTS_FOR_VARIANCE:
            return None, None, True

        returns = _return_series(points)
        symbol_variance = statistics.variance(returns)  # sample variance, ddof=1

        _, latest_price = points[-1]
        position_value = quantity * latest_price
        weight = position_value / portfolio_value

        weighted_variance += (weight ** 2) * symbol_variance

    volatility = weighted_variance.sqrt()
    var_95 = Z_SCORE_95 * volatility * portfolio_value
    return var_95, volatility, False


def compute_sharpe(
    portfolio_values: List[Tuple[datetime, Decimal]],
    risk_free_rate_annual: Decimal,
) -> Tuple[Optional[Decimal], bool]:
    """Sharpe = mean(excess returns) / stdev(excess returns), where each
    period's risk-free rate is annual_rate x actual_elapsed_seconds /
    year_seconds — measured from that pair's real timestamps rather than
    a fixed config period, so it stays correct regardless of how
    irregular the actual recompute cadence is."""
    if len(portfolio_values) < MIN_POINTS_FOR_VARIANCE:
        return None, True

    excess_returns = []
    for i in range(1, len(portfolio_values)):
        t_prev, pv_prev = portfolio_values[i - 1]
        t_curr, pv_curr = portfolio_values[i]

        portfolio_return = (pv_curr - pv_prev) / pv_prev
        elapsed_seconds = Decimal((t_curr - t_prev).total_seconds())
        period_risk_free = risk_free_rate_annual * elapsed_seconds / YEAR_SECONDS

        excess_returns.append(portfolio_return - period_risk_free)

    stdev = statistics.stdev(excess_returns)  # sample stdev, ddof=1
    if stdev == 0:
        # No variance in excess returns at all - Sharpe is undefined
        # (division by zero), not legitimately infinite or zero.
        return None, True

    sharpe = statistics.mean(excess_returns) / stdev
    return sharpe, False


# PUBLIC_INTERFACE
def compute_portfolio_risk_analysis(
    positions: Dict[str, Decimal],
    prices_by_symbol: Dict[str, List[Tuple[datetime, Decimal]]],
    cash: Decimal,
) -> dict:
    """Calculate covariance-aware, parametric, and historical risk metrics.

    The function is deliberately pure: callers provide persisted price series
    and receive an explicit insufficient-history response instead of a
    fabricated zero-risk measurement.
    """
    portfolio_value = compute_portfolio_value(positions, prices_by_symbol, cash)
    if not positions:
        return {
            "portfolio_value": portfolio_value,
            "var_95": Decimal("0"),
            "historical_var_95": Decimal("0"),
            "expected_shortfall_95": Decimal("0"),
            "volatility": Decimal("0"),
            "concentration_pct": Decimal("0"),
            "largest_position": None,
            "positions": [],
            "sample_size": 0,
            "insufficient_history": False,
        }

    return_sets = {
        symbol: _return_series(points)
        for symbol, points in prices_by_symbol.items()
        if symbol in positions and len(points) >= MIN_POINTS_FOR_VARIANCE
    }
    if len(return_sets) != len(positions):
        return {
            "portfolio_value": portfolio_value,
            "var_95": None,
            "historical_var_95": None,
            "expected_shortfall_95": None,
            "volatility": None,
            "concentration_pct": None,
            "largest_position": None,
            "positions": [],
            "sample_size": 0,
            "insufficient_history": True,
        }

    common_returns = min(len(series) for series in return_sets.values())
    if common_returns < 2 or portfolio_value == 0:
        return {
            "portfolio_value": portfolio_value,
            "var_95": None,
            "historical_var_95": None,
            "expected_shortfall_95": None,
            "volatility": None,
            "concentration_pct": None,
            "largest_position": None,
            "positions": [],
            "sample_size": common_returns,
            "insufficient_history": True,
        }

    aligned_returns = {
        symbol: series[-common_returns:] for symbol, series in return_sets.items()
    }
    values_by_symbol = {}
    weights = {}
    for symbol, quantity in positions.items():
        latest_price = prices_by_symbol[symbol][-1][1]
        value = quantity * latest_price
        values_by_symbol[symbol] = value
        weights[symbol] = value / portfolio_value

    portfolio_returns = [
        sum(
            (weights[symbol] * aligned_returns[symbol][index] for symbol in positions),
            Decimal("0"),
        )
        for index in range(common_returns)
    ]
    portfolio_variance = statistics.variance(portfolio_returns)
    volatility = portfolio_variance.sqrt()
    absolute_value = abs(portfolio_value)
    var_95 = Z_SCORE_95 * volatility * absolute_value

    ordered_returns = sorted(portfolio_returns)
    tail_count = max(
        1, int(len(ordered_returns) * float(Decimal("1") - CONFIDENCE_LEVEL))
    )
    tail_returns = ordered_returns[:tail_count]
    historical_var = max(Decimal("0"), -tail_returns[-1] * absolute_value)
    expected_shortfall = max(
        Decimal("0"),
        -(sum(tail_returns, Decimal("0")) / Decimal(len(tail_returns))) * absolute_value,
    )

    portfolio_mean = statistics.mean(portfolio_returns)
    position_rows = []
    for symbol in positions:
        symbol_returns = aligned_returns[symbol]
        symbol_mean = statistics.mean(symbol_returns)
        covariance = sum(
            (
                (symbol_returns[index] - symbol_mean)
                * (portfolio_returns[index] - portfolio_mean)
                for index in range(common_returns)
            ),
            Decimal("0"),
        ) / Decimal(common_returns - 1)
        component_var = (
            Decimal("0")
            if portfolio_variance == 0
            else Z_SCORE_95 * absolute_value * weights[symbol] * covariance / volatility
        )
        position_rows.append(
            {
                "symbol": symbol,
                "quantity": positions[symbol],
                "notional_value": values_by_symbol[symbol],
                "weight": weights[symbol],
                "component_var_95": component_var,
            }
        )

    position_rows.sort(key=lambda row: abs(row["notional_value"]), reverse=True)
    largest_position = position_rows[0]["symbol"] if position_rows else None
    concentration_pct = abs(position_rows[0]["weight"]) if position_rows else Decimal("0")
    return {
        "portfolio_value": portfolio_value,
        "var_95": var_95,
        "historical_var_95": historical_var,
        "expected_shortfall_95": expected_shortfall,
        "volatility": volatility,
        "concentration_pct": concentration_pct,
        "largest_position": largest_position,
        "positions": position_rows,
        "sample_size": common_returns,
        "insufficient_history": False,
    }
