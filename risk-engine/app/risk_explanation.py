"""Phase 12: a deterministic, rule-based one-line explanation of a risk
snapshot for GET /risk/me - built from the same numbers the snapshot
already carries (no extra lookups, no free-text generation), so it's as
testable as any other pure function here.
"""
from decimal import Decimal
from typing import Optional


def build_explanation(
    var_95: Optional[Decimal],
    volatility: Optional[Decimal],
    sharpe: Optional[Decimal],
    insufficient_history: bool,
) -> str:
    if insufficient_history or volatility is None:
        return "Not enough price history yet for a reliable risk read."

    # Thresholds are illustrative starting points, not calibrated against
    # a real portfolio risk model - deliberately simple and documented
    # here so they're easy to revisit, same as every other "this cutoff
    # was a deliberate choice" comment elsewhere in this codebase.
    high_volatility = volatility >= Decimal("0.03")
    negative_sharpe = sharpe is not None and sharpe < 0

    if high_volatility and negative_sharpe:
        return "Elevated volatility with poor risk-adjusted returns."
    if high_volatility:
        return "Elevated volatility relative to typical conditions."
    if negative_sharpe:
        return "Low volatility, but risk-adjusted returns are currently negative."
    return "Stable risk profile - volatility and risk-adjusted returns are within typical ranges."
