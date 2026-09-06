"""Phase 7: dedup ledger for consumed stream events (BLUEPRINT.md §3's
applied_events table — shared across both market.ticks and ledger.events).

try_mark_applied deliberately does NOT commit — it's meant to run inside
the same transaction as whatever effect the event causes (a price_history
insert, or a risk_snapshot recompute). If that effect fails and the
transaction rolls back, the dedup mark rolls back with it, so the event
is correctly retried on redelivery rather than being permanently (and
wrongly) marked as applied despite never having taken effect.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


def try_mark_applied(session: Session, event_id: str) -> bool:
    """Returns True if this event_id was newly marked (caller should
    proceed), False if it was already applied (caller should skip)."""
    row = session.execute(
        text(
            """
            INSERT INTO applied_events (event_id)
            VALUES (:event_id)
            ON CONFLICT (event_id) DO NOTHING
            RETURNING event_id
            """
        ),
        {"event_id": event_id},
    ).first()
    return row is not None
