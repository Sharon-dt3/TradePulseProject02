"""Account-scoped detailed and projected portfolio risk analysis."""
from datetime import datetime, time, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app import positions_repository, price_history_repository
from app.config import settings
from app.risk_calculator import InsufficientPriceHistory, compute_portfolio_risk_analysis

NEW_YORK_TIMEZONE = ZoneInfo("America/New_York")
EQUITY_MARKET_OPEN = time(9, 30)
EQUITY_MARKET_CLOSE = time(16, 0)


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


def _crypto_symbols() -> set[str]:
    """Return the configured comma-separated crypto symbols in normalized form."""
    return {
        symbol.strip().upper()
        for symbol in settings.risk_crypto_symbols.split(",")
        if symbol.strip()
    }


def _is_equity_market_open(now: datetime) -> bool:
    """Return whether the standard U.S. equity session is currently open.

    Exchange holidays and special sessions are not modelled here; a feed-health
    integration can refine this schedule later without changing quote semantics.
    """
    new_york_now = now.astimezone(NEW_YORK_TIMEZONE)
    return (
        new_york_now.weekday() < 5
        and EQUITY_MARKET_OPEN <= new_york_now.time() < EQUITY_MARKET_CLOSE
    )


def _as_utc(observed_at: datetime) -> datetime:
    """Normalize persisted price timestamps to timezone-aware UTC datetimes."""
    if observed_at.tzinfo is None:
        return observed_at.replace(tzinfo=timezone.utc)
    return observed_at.astimezone(timezone.utc)


def _freshness_metadata(history: dict[str, list]) -> dict:
    """Return transparent, per-symbol quote freshness for held positions."""
    now = datetime.now(timezone.utc)
    crypto_symbols = _crypto_symbols()
    equity_market_open = _is_equity_market_open(now)
    price_freshness = []

    for symbol, points in history.items():
        is_crypto = symbol.upper() in crypto_symbols
        asset_class = "crypto" if is_crypto else "equity"
        threshold_seconds = (
            settings.risk_crypto_price_stale_after_seconds
            if is_crypto
            else settings.risk_equity_price_stale_after_seconds
        )

        if not points:
            price_freshness.append(
                {
                    "symbol": symbol,
                    "asset_class": asset_class,
                    "data_as_of": None,
                    "age_seconds": None,
                    "stale_after_seconds": threshold_seconds,
                    "status": "missing",
                    "is_stale": True,
                }
            )
            continue

        data_as_of = _as_utc(points[-1][0])
        age_seconds = max(0, int((now - data_as_of).total_seconds()))
        market_closed = not is_crypto and not equity_market_open
        is_stale = not market_closed and age_seconds > threshold_seconds
        price_freshness.append(
            {
                "symbol": symbol,
                "asset_class": asset_class,
                "data_as_of": data_as_of,
                "age_seconds": age_seconds,
                "stale_after_seconds": threshold_seconds,
                "status": (
                    "market_closed"
                    if market_closed
                    else "stale"
                    if is_stale
                    else "fresh"
                ),
                "is_stale": is_stale,
            }
        )

    stale_symbols = [
        quote["symbol"] for quote in price_freshness if quote["is_stale"]
    ]
    available_quotes = [
        quote["data_as_of"] for quote in price_freshness if quote["data_as_of"]
    ]
    return {
        "data_as_of": min(available_quotes) if available_quotes else None,
        "price_data_stale": bool(stale_symbols),
        "stale_symbols": stale_symbols,
        "price_freshness": price_freshness,
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
        "crypto_stale_after_seconds": settings.risk_crypto_price_stale_after_seconds,
        "equity_stale_after_seconds": settings.risk_equity_price_stale_after_seconds,
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
