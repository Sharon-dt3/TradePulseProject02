"""Phase 7: read-only lookup into ledger-core's "accounts"/"trades" tables
for an account's current cash and per-symbol position.

Same cross-service pattern as accounts_repository.py (Phase 1) — risk-
engine doesn't own these tables, but shares one Supabase Postgres database
with ledger-core, so this is a query, not a network call.

Positions are computed here rather than tracked incrementally, since
ledger-core's trades table is the single source of truth for what actually
happened — recomputing from it avoids risk-engine's own position state
ever drifting out of sync with ledger-core's.
"""
from decimal import Decimal
from typing import Dict, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_cash_balance(session: Session, account_id: UUID) -> Optional[Decimal]:
    row = session.execute(
        text("SELECT cash_balance FROM accounts WHERE id = :account_id"),
        {"account_id": str(account_id)},
    ).first()
    return row[0] if row else None


def get_positions(session: Session, account_id: UUID) -> Dict[str, Decimal]:
    """Net quantity held per symbol (BUY positive, SELL negative). Symbols
    netted exactly to zero are omitted — a fully closed position
    contributes no exposure and needs no price lookup for VaR."""
    rows = session.execute(
        text(
            """
            SELECT symbol, SUM(CASE WHEN side = 'BUY' THEN quantity ELSE -quantity END) AS position
            FROM trades
            WHERE account_id = :account_id
            GROUP BY symbol
            HAVING SUM(CASE WHEN side = 'BUY' THEN quantity ELSE -quantity END) != 0
            """
        ),
        {"account_id": str(account_id)},
    ).all()
    return {row.symbol: row.position for row in rows}
