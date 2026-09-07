"""Phase 0 baseline entrypoint for risk-engine, extended in Phase 1 (JWKS
auth) and Phase 7 (market.ticks/ledger.events consumers).

"risk-engine-1" is a single hardcoded consumer name, same caveat as
MarketTickConsumer.java's "ledger-core-1": correct for one running
instance; horizontally scaling risk-engine would need a real per-instance
name so each instance is a distinct consumer within the same group.
"""
from uuid import UUID

import redis
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.db import get_session
from app.ledger_events_consumer import LedgerEventsConsumer
from app.market_tick_consumer import MarketTickConsumer
from app.risk_service import get_latest_snapshot_for_user
from app.risk_explanation import build_explanation

app = FastAPI(title="risk-engine")

_redis_client = redis.Redis(host=settings.redis_host, port=settings.redis_port, decode_responses=True)

_market_tick_consumer = MarketTickConsumer(
    _redis_client, settings.market_ticks_stream, settings.risk_consumer_group, "risk-engine-1"
)
_ledger_events_consumer = LedgerEventsConsumer(
    _redis_client, settings.ledger_events_stream, settings.risk_consumer_group, "risk-engine-1"
)


@app.on_event("startup")
def start_consumers():
    _market_tick_consumer.start()
    _ledger_events_consumer.start()


@app.on_event("shutdown")
def stop_consumers():
    _market_tick_consumer.stop()
    _ledger_events_consumer.stop()


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/whoami")
def whoami(user: dict = Depends(get_current_user)):
    return {"sub": user["sub"], "email": user.get("email")}


@app.get("/risk/me")
def get_my_risk_snapshot(
    user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user_id = UUID(user["sub"])
    snapshot = get_latest_snapshot_for_user(session, user_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="No risk snapshot found")
    snapshot["risk_explanation"] = build_explanation(
        snapshot["var_95"], snapshot["volatility"], snapshot["sharpe"], snapshot["insufficient_history"]
    )
    return snapshot
