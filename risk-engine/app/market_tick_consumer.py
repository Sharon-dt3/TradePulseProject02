"""Phase 7: the cg:risk-engine consumer group on "market.ticks" — writes
each tick to price_history. Field names/shape match what
tools/tick-producer publishes and MarketTickConsumer.java already
consumes on ledger-core's side (symbol/price/ts), since both services
read the same stream.
"""
from datetime import datetime, timezone
from decimal import Decimal

from app.db import SessionLocal
from app.stream_consumer import StreamConsumer
from app import applied_events_repository, price_history_repository


class MarketTickConsumer(StreamConsumer):
    def handle_record(self, record_id: str, fields: dict) -> None:
        event_id = f"market.ticks:{record_id}"
        symbol = fields["symbol"]
        price = Decimal(fields["price"])
        observed_at = datetime.fromtimestamp(int(fields["ts"]) / 1000, tz=timezone.utc)

        with SessionLocal() as session:
            with session.begin():
                if not applied_events_repository.try_mark_applied(session, event_id):
                    return
                price_history_repository.insert_price(session, symbol, price, observed_at)
