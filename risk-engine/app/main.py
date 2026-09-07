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
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.db import get_session
from app.ledger_events_consumer import LedgerEventsConsumer
from app.market_tick_consumer import MarketTickConsumer
from app.risk_service import get_latest_snapshot_for_user, get_risk_history_for_user
from app.risk_explanation import build_explanation
from app.risk_aggregate_service import get_firm_wide_aggregate
from app.permission_service import require_permission, roles_from_user

app = FastAPI(
    title="TradePulse Risk Engine",
    description="Authenticated account and firm-wide risk analysis for TradePulse.",
    version="1.0.0",
    openapi_tags=[
        {"name": "risk", "description": "Account-scoped and firm-wide risk analysis."},
    ],
)

# Phase 20: GET /risk/me and GET /risk/aggregate are now called directly
# from the dashboard's browser context (previously nothing hit risk-engine
# straight from a browser - SSE goes through gateway instead), so this
# needs the same single-configured-origin CORS handling ledger-core's
# SecurityConfig already has. DELETE is irrelevant here (risk-engine has
# no mutating endpoints), so only GET/OPTIONS are allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.dashboard_allowed_origin],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

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


@app.get(
    "/risk/me/history",
    tags=["risk"],
    operation_id="getMyRiskHistory",
    summary="Get recorded account risk trends",
    description=(
        "Returns the authenticated user's recorded portfolio-value trend, "
        "changes from the prior stored snapshot, and recent executed trades."
    ),
)
# PUBLIC_INTERFACE
def get_my_risk_history(
    user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return the caller's recorded risk trend and recent execution context.

    Args:
        user: Verified JWT claims for the authenticated caller.
        session: Database session used for ownership-scoped reads.

    Returns:
        A historical risk summary, or HTTP 404 when no risk snapshot exists.
    """
    history = get_risk_history_for_user(session, UUID(user["sub"]))
    if history is None:
        raise HTTPException(status_code=404, detail="No risk history found")
    return history


@app.get("/risk/aggregate")
def get_aggregate_risk(
    user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Phase 17: firm-wide risk for Risk Manager (and Admin). Gated by
    risk.aggregate.read, already seeded to both roles back in V3 - no
    new migration needed, just the read path neither role had before."""
    require_permission(session, roles_from_user(user), "risk.aggregate.read")
    return get_firm_wide_aggregate(session)
