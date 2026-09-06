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
