"""Phase 1: read-only lookup into ledger-core's "accounts" table.

risk-engine doesn't own this table — ledger-core does — but both share
one Supabase Postgres database (BLUEPRINT.md §5), so a read-only lookup
here is just a query, not a network call. This is the only place that
table name appears outside ledger-core, so if the ownership model ever
changes, there's exactly one function to update.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_account_id_for_user(session: Session, user_id: UUID) -> Optional[UUID]:
    row = session.execute(
        text("SELECT id FROM accounts WHERE user_id = :user_id"),
        {"user_id": str(user_id)},
    ).first()
    return row[0] if row else None