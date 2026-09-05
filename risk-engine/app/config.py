"""Phase 0: connection config for risk-engine.
DATABASE_URL is the Supavisor pooled connection string (application
traffic). Alembic migrations use their own direct/unpooled connection,
configured separately in alembic.ini / env.py — never DATABASE_URL — per
BLUEPRINT.md §5's pooled-vs-direct split.

Phase 1: SUPABASE_JWKS_URL and SUPABASE_JWT_ISSUER are the same JWKS
endpoint and issuer ledger-core uses (BLUEPRINT.md §4) — both services
verify tokens issued by the same Supabase Auth instance.

extra = "ignore" is needed because .env also holds ALEMBIC_DATABASE_URL,
which Alembic's env.py reads directly and is not (and should not be) a
field on this Settings class — pydantic-settings otherwise rejects any
.env key it doesn't recognize.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str  # env: DATABASE_URL — Supavisor pooled, port 6543
    supabase_jwks_url: str  # env: SUPABASE_JWKS_URL
    supabase_jwt_issuer: str  # env: SUPABASE_JWT_ISSUER

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()