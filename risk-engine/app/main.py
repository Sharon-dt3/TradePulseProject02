"""Phase 0 baseline entrypoint for risk-engine.

Tick/ledger-event consumption (Phase 7), JWKS verification (Phase 1), and
risk computation all land in later phases — this is intentionally minimal.
"""

from fastapi import FastAPI

app = FastAPI(title="risk-engine")


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
