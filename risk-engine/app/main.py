"""Phase 0 baseline entrypoint for risk-engine.
Tick/ledger-event consumption (Phase 7) and risk computation land in
later phases. Phase 1 JWKS verification is wired in below via
app.auth.get_current_user.
"""
from fastapi import Depends, FastAPI

from app.auth import get_current_user

app = FastAPI(title="risk-engine")


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/whoami")
def whoami(user: dict = Depends(get_current_user)):
    return {"sub": user["sub"], "email": user.get("email")}