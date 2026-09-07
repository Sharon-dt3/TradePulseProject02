"""Phase 1: read access to risk_snapshots, scoped by account_id.

Only ever queried by account_id — never by any client-supplied filter —
so there is no parameter here a caller could use to ask for someone
else's data.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_latest_snapshot_for_account(session: Session, account_id: UUID) -> Optional[dict]:
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


def get_latest_snapshots_all_accounts(session: Session) -> list:
    """One row per account_id - the most recent risk_snapshots row for
    each, via DISTINCT ON (account_id) ordered by computed_at DESC.
    Phase 17's firm-wide counterpart to get_latest_snapshot_for_account
    above: same "latest row per account" idea, just not filtered down
    to one account_id first."""
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
