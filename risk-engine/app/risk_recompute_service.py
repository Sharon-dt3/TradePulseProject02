"""Phase 7: orchestrates one account's risk_snapshot recompute — reads
current position/cash and price history, runs the pure math in
risk_calculator, and writes both pv_history and risk_snapshots.

Kept separate from ledger_events_consumer.py so the consumer stays thin
(routing + dedup only), same split as OrderController/OrderServiceImpl.
"""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.config import settings
from app import positions_repository, price_history_repository, pv_history_repository, risk_snapshot_repository
from app.risk_calculator import compute_portfolio_value, compute_sharpe, compute_var_and_volatility


def recompute_for_account(
    session: Session,
    account_id: UUID,
    price_history_window: int,
) -> None:
    positions = positions_repository.get_positions(session, account_id)
    cash = positions_repository.get_cash_balance(session, account_id)
    if cash is None:
        raise ValueError(f"account {account_id} not found in accounts table")

    prices_by_symbol = {
        symbol: price_history_repository.get_recent_prices(session, symbol, price_history_window)
        for symbol in positions
    }

    # Can raise InsufficientPriceHistory - deliberately left uncaught so
    # it propagates out of handle_record and the triggering event goes
    # unacked for retry, per risk_calculator's own docstring.
    portfolio_value = compute_portfolio_value(positions, prices_by_symbol, cash)

    var_95, volatility, insufficient_var = compute_var_and_volatility(
        positions, prices_by_symbol, portfolio_value
    )

    now = datetime.now(timezone.utc)
    pv_history_repository.insert_portfolio_value(session, account_id, portfolio_value, now)

    # Includes the row just inserted above (same transaction, same
    # session) - needed so Sharpe's return series has this observation.
    recent_pvs = pv_history_repository.get_recent_portfolio_values(
        session, account_id, price_history_window
    )
    sharpe, insufficient_sharpe = compute_sharpe(recent_pvs, settings.risk_free_rate_annual)

    risk_snapshot_repository.insert_snapshot(
        session,
        account_id,
        var_95,
        volatility,
        sharpe,
        insufficient_history=insufficient_var or insufficient_sharpe,
        computed_at=now,
    )
