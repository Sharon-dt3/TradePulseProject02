"""Phase 7: read/write access to price_history.

get_recent_prices returns the last `limit` observations for a symbol in
chronological order (oldest first) — the inner query does the actual
DESC-ordered LIMIT to get the *most recent* N rows, then the outer query
re-sorts them ASC, since a return series (r_t = (p_t - p_{t-1}) / p_{t-1})
needs chronological order to compute correctly, while "most recent N" is
inherently a DESC-ordered concept.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session


def insert_price(session: Session, symbol: str, price: Decimal, observed_at: datetime) -> None:
    session.execute(
        text(
            "INSERT INTO price_history (symbol, price, observed_at) "
            "VALUES (:symbol, :price, :observed_at)"
        ),
        {"symbol": symbol, "price": price, "observed_at": observed_at},
    )


def get_recent_prices(session: Session, symbol: str, limit: int) -> List[Tuple[datetime, Decimal]]:
    rows = session.execute(
        text(
            """
            SELECT observed_at, price FROM (
                SELECT observed_at, price
                FROM price_history
                WHERE symbol = :symbol
                ORDER BY observed_at DESC
                LIMIT :limit
            ) most_recent
            ORDER BY observed_at ASC
            """
        ),
        {"symbol": symbol, "limit": limit},
    ).all()
    return [(row.observed_at, row.price) for row in rows]
