"""Read access to account-scoped risk snapshots and recent executed trades.

Every query is constrained by an internally resolved account_id. Routes never
accept an account identifier from the browser, preventing users from using the
trend endpoint to inspect another account's risk or trading activity.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


# PUBLIC_INTERFACE
def get_latest_snapshot_for_account(session: Session, account_id: UUID) -> Optional[dict]:
    """Return the newest stored risk snapshot for an account, if one exists."""
    row = session.execute(
        text(
            """
            SELECT var_95, volatility, sharpe, portfolio_value, insufficient_history, computed_at
            FROM risk_snapshots
            WHERE account_id = :account_id
            ORDER BY computed_at DESC
            LIMIT 1
            """
        ),
        {"account_id": str(account_id)},
    ).mappings().first()
    return dict(row) if row else None


# PUBLIC_INTERFACE
def get_recent_snapshots_for_account(session: Session, account_id: UUID, limit: int) -> list[dict]:
    """Return a chronological sample of the account's most recent risk snapshots."""
    rows = session.execute(
        text(
            """
            SELECT var_95, volatility, sharpe, portfolio_value, insufficient_history, computed_at
            FROM (
                SELECT var_95, volatility, sharpe, portfolio_value, insufficient_history, computed_at
                FROM risk_snapshots
                WHERE account_id = :account_id
                ORDER BY computed_at DESC
                LIMIT :limit
            ) recent_snapshots
            ORDER BY computed_at ASC
            """
        ),
        {"account_id": str(account_id), "limit": limit},
    ).mappings().all()
    return [dict(row) for row in rows]


# PUBLIC_INTERFACE
def get_recent_trades_for_account(session: Session, account_id: UUID, limit: int) -> list[dict]:
    """Return the account's latest executed trades, newest first."""
    rows = session.execute(
        text(
            """
            SELECT symbol, side, quantity, price, executed_at
            FROM trades
            WHERE account_id = :account_id
            ORDER BY executed_at DESC
            LIMIT :limit
            """
        ),
        {"account_id": str(account_id), "limit": limit},
    ).mappings().all()
    return [dict(row) for row in rows]


# PUBLIC_INTERFACE
def get_latest_snapshots_all_accounts(session: Session) -> list:
    """Return one newest risk snapshot for each account."""
    rows = session.execute(
        text(
            """
            SELECT DISTINCT ON (account_id)
                account_id, var_95, volatility, sharpe, portfolio_value,
                insufficient_history, computed_at
            FROM risk_snapshots
            ORDER BY account_id, computed_at DESC
            """
        )
    ).mappings().all()
    return [dict(row) for row in rows]
