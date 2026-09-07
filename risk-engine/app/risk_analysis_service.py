"""Account-scoped detailed and projected portfolio risk analysis."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app import positions_repository, price_history_repository
from app.config import settings
from app.risk_calculator import InsufficientPriceHistory, compute_portfolio_risk_analysis


def _price_history_for_positions(
    session: Session, positions: dict[str, Decimal]
) -> dict[str, list]:
    """Load the configured persisted return window for each held symbol."""
    return {
        symbol: price_history_repository.get_recent_prices(
            session, symbol, settings.price_history_window
        )
        for symbol in positions
    }


def _freshness_metadata(history: dict[str, list]) -> dict:
    """Return the oldest latest quote across held symbols as portfolio freshness."""
    latest_observations = [points[-1][0] for points in history.values() if points]
    if not latest_observations:
        return {"data_as_of": None, "price_data_stale": True}

    data_as_of = min(latest_observations)
    if data_as_of.tzinfo is None:
        data_as_of = data_as_of.replace(tzinfo=timezone.utc)
    age_seconds = max(0, (datetime.now(timezone.utc) - data_as_of).total_seconds())
    return {
        "data_as_of": data_as_of,
        "price_data_stale": age_seconds > settings.risk_price_stale_after_seconds,
    }


def _analyze(
    positions: dict[str, Decimal], cash: Decimal, history: dict[str, list]
) -> dict:
    """Build analysis while converting a missing quote race into usable output."""
    freshness = _freshness_metadata(history)
    try:
        analysis = compute_portfolio_risk_analysis(positions, history, cash)
    except InsufficientPriceHistory:
        analysis = {
            "portfolio_value": None,
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
    analysis.update(freshness)
    analysis["methodology"] = {
        "confidence_level": Decimal("0.95"),
        "horizon": "one observed return period",
        "price_history_window": settings.price_history_window,
        "covariance_model": "sample covariance from aligned persisted returns",
        "stale_after_seconds": settings.risk_price_stale_after_seconds,
    }
    analysis["concentration_warning"] = bool(
        analysis["concentration_pct"] is not None
        and analysis["concentration_pct"] >= settings.risk_concentration_warning_pct
    )
    return analysis


# PUBLIC_INTERFACE
def get_account_risk_analysis(session: Session, account_id: UUID) -> Optional[dict]:
    """Return current detailed analytics for one account owned by the caller."""
    cash = positions_repository.get_cash_balance(session, account_id)
    if cash is None:
        return None

    positions = positions_repository.get_positions(session, account_id)
    return _analyze(positions, cash, _price_history_for_positions(session, positions))


# PUBLIC_INTERFACE
def project_account_order_risk(
    session: Session,
    account_id: UUID,
    symbol: str,
    side: str,
    quantity: Decimal,
    reference_price: Decimal,
) -> Optional[dict]:
    """Return non-binding risk analytics after a proposed order.

    Ledger-core remains the order authority and must enforce any future
    risk-limit policy independently before accepting or executing an order.
    """
    cash = positions_repository.get_cash_balance(session, account_id)
    if cash is None:
        return None

    positions = positions_repository.get_positions(session, account_id)
    signed_quantity = quantity if side == "BUY" else -quantity
    projected_positions = dict(positions)
    projected_positions[symbol] = (
        projected_positions.get(symbol, Decimal("0")) + signed_quantity
    )
    if projected_positions[symbol] == 0:
        del projected_positions[symbol]

    projected_cash = cash - (signed_quantity * reference_price)
    analysis = _analyze(
        projected_positions,
        projected_cash,
        _price_history_for_positions(session, projected_positions),
    )
    analysis["reference_price"] = reference_price
    analysis["advisory_only"] = True
    return analysis
