"""Phase 7: write access to risk_snapshots."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def insert_snapshot(
    session: Session,
    account_id: UUID,
    var_95: Optional[Decimal],
    volatility: Optional[Decimal],
    sharpe: Optional[Decimal],
    insufficient_history: bool,
    computed_at: datetime,
) -> None:
    session.execute(
        text(
            """
            INSERT INTO risk_snapshots
                (account_id, var_95, volatility, sharpe, insufficient_history, computed_at)
            VALUES
                (:account_id, :var_95, :volatility, :sharpe, :insufficient_history, :computed_at)
            """
        ),
        {
            "account_id": str(account_id),
            "var_95": var_95,
            "volatility": volatility,
            "sharpe": sharpe,
            "insufficient_history": insufficient_history,
            "computed_at": computed_at,
        },
    )
