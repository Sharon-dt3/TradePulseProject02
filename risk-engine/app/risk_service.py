"""Ownership-scoped risk data access and trader-risk history summaries."""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.accounts_repository import get_account_id_for_user
from app.risk_repository import (
    get_latest_snapshot_for_account,
    get_recent_snapshots_for_account,
    get_recent_trades_for_account,
)

HISTORY_SNAPSHOT_LIMIT = 12
RECENT_TRADE_LIMIT = 5


def _decimal_delta(current: Optional[Decimal], previous: Optional[Decimal]) -> Optional[Decimal]:
    """Return a metric change only when both recorded values are meaningful."""
    if current is None or previous is None:
        return None
    return current - previous


# PUBLIC_INTERFACE
def get_latest_snapshot_for_user(session: Session, user_id: UUID) -> Optional[dict]:
    """Return the latest risk snapshot belonging to the authenticated user."""
    account_id = get_account_id_for_user(session, user_id)
    if account_id is None:
        return None
    return get_latest_snapshot_for_account(session, account_id)


# PUBLIC_INTERFACE
def get_risk_history_for_user(session: Session, user_id: UUID) -> Optional[dict]:
    """Return a user's recorded risk trend, metric deltas, and recent trades.

    The trend is derived only from persisted risk snapshots. It does not infer
    values between observations or fabricate performance when history is sparse.
    """
    account_id = get_account_id_for_user(session, user_id)
    if account_id is None:
        return None

    snapshots = get_recent_snapshots_for_account(session, account_id, HISTORY_SNAPSHOT_LIMIT)
    if not snapshots:
        return None

    latest = snapshots[-1]
    previous = snapshots[-2] if len(snapshots) > 1 else None
    trend = [
        {
            "portfolio_value": snapshot["portfolio_value"],
            "computed_at": snapshot["computed_at"],
        }
        for snapshot in snapshots
    ]

    return {
        "sample_size": len(snapshots),
        "trend": trend,
        "changes": {
            "portfolio_value": _decimal_delta(
                latest["portfolio_value"],
                previous["portfolio_value"] if previous else None,
            ),
            "var_95": _decimal_delta(
                latest["var_95"],
                previous["var_95"] if previous else None,
            ),
            "volatility": _decimal_delta(
                latest["volatility"],
                previous["volatility"] if previous else None,
            ),
            "sharpe": _decimal_delta(
                latest["sharpe"],
                previous["sharpe"] if previous else None,
            ),
        },
        "recent_trades": get_recent_trades_for_account(session, account_id, RECENT_TRADE_LIMIT),
    }
