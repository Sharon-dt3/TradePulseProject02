"""Phase 0: connection config for risk-engine.

DATABASE_URL is the Supavisor pooled connection string (application
traffic). Alembic migrations use their own direct/unpooled connection,
configured separately in alembic.ini / env.py — never DATABASE_URL — per
BLUEPRINT.md §5's pooled-vs-direct split.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str  # env: DATABASE_URL — Supavisor pooled, port 6543

    class Config:
        env_file = ".env"


settings = Settings()
