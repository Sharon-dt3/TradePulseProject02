"""Phase 0: RiskStore — points at DATABASE_URL from its first commit.

Per IMPLEMENTATION_PLAN.md Phase 0: no SQLite step, no RISK_DB_PATH ever
existed in this repo (greenfield) — this is Postgres via Supabase from
commit one.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
