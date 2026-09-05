"""Phase 1: database session handling for runtime queries (not migrations
— those stay in alembic/env.py, using ALEMBIC_DATABASE_URL, per
BLUEPRINT.md §5's pooled-vs-direct split).

This engine uses DATABASE_URL (Supavisor pooled), the same connection
string every other piece of application traffic uses.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

_db_url = settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(_db_url)
SessionLocal = sessionmaker(bind=engine)


def get_session():
    """FastAPI dependency: yields one session per request, always closed
    afterward — even if the route raises."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()