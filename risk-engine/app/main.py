"""Phase 0 baseline entrypoint for risk-engine.
Tick/ledger-event consumption (Phase 7) and risk computation land in
later phases. Phase 1 JWKS verification is wired in below via
app.auth.get_current_user.
"""
from uuid import UUID
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.db import get_session
from app.risk_service import get_latest_snapshot_for_user

app = FastAPI(title="risk-engine")


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
    return snapshot