"""Phase 0: connection config for risk-engine.
DATABASE_URL is the Supavisor pooled connection string (application
traffic). Alembic migrations use their own direct/unpooled connection,
configured separately in alembic.ini / env.py — never DATABASE_URL — per
BLUEPRINT.md §5's pooled-vs-direct split.

Phase 1: SUPABASE_JWKS_URL and SUPABASE_JWT_ISSUER are the same JWKS
endpoint and issuer ledger-core uses (BLUEPRINT.md §4) — both services
verify tokens issued by the same Supabase Auth instance.

Phase 7: stream/consumer config for the cg:risk-engine consumer group.
ledger_events_stream defaults to "ledger.events" — the actual stream
OutboxRelay publishes to (ledger.outbox.stream-name in ledger-core's
application.yml) — not "ledger.updates", which is BLUEPRINT.md's diagram
label for the same stream but isn't the real configured name anywhere.
Consuming the diagram's name instead of the real one would silently
receive nothing, so this is deliberately pinned to what's actually
configured on the publishing side.

price_history_window is used as the row LIMIT when querying recent
price_history for a symbol — both for "the latest price" (the newest row
of that same result) and as the return-series input for VaR/volatility,
so one config value serves both rather than two that could drift apart.
The floor validator enforces the 20-30 point statistical-meaningfulness
requirement from the Phase 7 checklist.

risk_free_rate_annual has no default: per the Phase 7 checklist, it
"defaults to 0 only if explicitly configured, never by omission" — making
it a required pydantic field means a missing env var fails startup with a
clear error, rather than silently behaving as if the rate were 0.

extra = "ignore" is needed because .env also holds ALEMBIC_DATABASE_URL,
which Alembic's env.py reads directly and is not (and should not be) a
field on this Settings class — pydantic-settings otherwise rejects any
.env key it doesn't recognize.
"""
from decimal import Decimal

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str  # env: DATABASE_URL — Supavisor pooled, port 6543
    supabase_jwks_url: str  # env: SUPABASE_JWKS_URL
    supabase_jwt_issuer: str  # env: SUPABASE_JWT_ISSUER

    redis_host: str = "localhost"  # env: REDIS_HOST
    redis_port: int = 6379  # env: REDIS_PORT

    market_ticks_stream: str = "market.ticks"  # env: MARKET_TICKS_STREAM
    ledger_events_stream: str = "ledger.events"  # env: LEDGER_EVENTS_STREAM
    risk_consumer_group: str = "cg:risk-engine"  # env: RISK_CONSUMER_GROUP

    price_history_window: int = 30  # env: PRICE_HISTORY_WINDOW

    risk_free_rate_annual: Decimal  # env: RISK_FREE_RATE_ANNUAL — required, no default

    @field_validator("price_history_window")
    @classmethod
    def enforce_statistically_meaningful_window(cls, value: int) -> int:
        if value < 20:
            raise ValueError(
                f"price_history_window must be at least 20 (Phase 7's "
                f"statistical-meaningfulness floor), got {value}"
            )
        return value

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
