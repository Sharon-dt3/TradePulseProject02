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

        snapshot_fields = None
        with SessionLocal() as session:
            with session.begin():
                if not applied_events_repository.try_mark_applied(session, event_id):
                    return
                snapshot_fields = recompute_for_account(
                    session, account_id, settings.price_history_window
                )

        # Published only after the transaction above has committed, so a
        # dashboard subscriber never sees a risk.updates event for a
        # snapshot that could still roll back. Caveat: if this xadd itself
        # raises, handle_record raises too and the record is redelivered
        # per stream_consumer.py's at-least-once contract - but
        # try_mark_applied will then see event_id as already applied and
        # return early above, so the retry recomputes nothing and never
        # republishes. Accepted for now: risk_snapshots (already
        # committed) stays the source of truth; risk.updates is a
        # best-effort live push, not authoritative.
        self._redis.xadd(settings.risk_updates_stream, snapshot_fields)
