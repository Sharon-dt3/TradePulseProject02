"""Phase 7: the cg:risk-engine consumer group on "ledger.events" (the
real stream OutboxRelay publishes to — see config.py's docstring for why
this isn't "ledger.updates"). On a TradePosted event, recomputes that
one account's risk_snapshot — per this project's chosen design, recompute
is trade-triggered only, not per-tick.
"""
import json
from uuid import UUID

from app.config import settings
from app.db import SessionLocal
from app.stream_consumer import StreamConsumer
from app import applied_events_repository
from app.risk_recompute_service import recompute_for_account


class LedgerEventsConsumer(StreamConsumer):
    def handle_record(self, record_id: str, fields: dict) -> None:
        event_id = f"ledger.events:{record_id}"

        if fields.get("eventType") != "TradePosted":
            return  # only trade fills trigger a recompute today

        payload = json.loads(fields["payload"])
        account_id = UUID(payload["accountId"])

        with SessionLocal() as session:
            with session.begin():
                if not applied_events_repository.try_mark_applied(session, event_id):
                    return
                recompute_for_account(session, account_id, settings.price_history_window)
