"""Phase 1: ownership-scoped risk data access.

This is the one place that knows the full rule: a user's risk data is
whatever belongs to *their* account, found by following user_id ->
account_id -> risk_snapshots. Callers (routes) never see account_id at
all — they only ever pass the verified user_id from a JWT.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.accounts_repository import get_account_id_for_user
from app.risk_repository import get_latest_snapshot_for_account


def get_latest_snapshot_for_user(session: Session, user_id: UUID) -> Optional[dict]:
    account_id = get_account_id_for_user(session, user_id)
    if account_id is None:
        return None
    return get_latest_snapshot_for_account(session, account_id)