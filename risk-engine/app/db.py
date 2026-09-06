"""Phase 1: database session handling for runtime queries (not migrations
— those stay in alembic/env.py, using ALEMBIC_DATABASE_URL, per
BLUEPRINT.md §5's pooled-vs-direct split).

This engine uses DATABASE_URL (Supavisor pooled), the same connection
string every other piece of application traffic uses.

Phase 7: prepare_threshold=None disables psycopg3's automatic
server-side prepared statements. Supavisor's transaction-mode pooling
(port 6543) can route what looks like one logical connection to a
different backend Postgres session between statements, so a prepared
statement created on one backend session may not exist on the next one
the pooler hands back — surfacing as DuplicatePreparedStatement or
InvalidSqlStatementName errors. Same root cause ledger-core's
application.yml already documents (prepareThreshold: 0 / cachePrepStmts:
false for HikariCP) — the Java and Python fixes look different because
they're different drivers, but the underlying problem is identical.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

_db_url = settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(_db_url, connect_args={"prepare_threshold": None})
SessionLocal = sessionmaker(bind=engine)


def get_session():
    """FastAPI dependency: yields one session per request, always closed
    afterward — even if the route raises."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
