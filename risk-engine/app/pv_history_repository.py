"""Phase 7: read/write access to pv_history (per-account portfolio-value
snapshots), used as the return-series input for Sharpe.

Same DESC-then-ASC pattern as price_history_repository.get_recent_prices
— see that function's docstring for why.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Tuple
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def insert_portfolio_value(
    session: Session, account_id: UUID, portfolio_value: Decimal, observed_at: datetime
) -> None:
    session.execute(
        text(
            "INSERT INTO pv_history (account_id, portfolio_value, observed_at) "
            "VALUES (:account_id, :portfolio_value, :observed_at)"
        ),
        {"account_id": str(account_id), "portfolio_value": portfolio_value, "observed_at": observed_at},
    )


def get_recent_portfolio_values(
    session: Session, account_id: UUID, limit: int
) -> List[Tuple[datetime, Decimal]]:
    rows = session.execute(
        text(
            """
            SELECT observed_at, portfolio_value FROM (
                SELECT observed_at, portfolio_value
                FROM pv_history
                WHERE account_id = :account_id
                ORDER BY observed_at DESC
                LIMIT :limit
            ) most_recent
            ORDER BY observed_at ASC
            """
        ),
        {"account_id": str(account_id), "limit": limit},
    ).all()
    return [(row.observed_at, row.portfolio_value) for row in rows]
