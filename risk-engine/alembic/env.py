import os
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import create_engine, pool

# Load risk-engine/.env (this file lives in risk-engine/alembic/, so the
# .env is one directory up) since Alembic itself has no notion of it —
# only pydantic-settings (used elsewhere in app/config.py) auto-loads it.
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Direct/unpooled Supabase connection string — migrations only, never the
# Supavisor pooled string the application uses. Set this in your shell/.env
# as ALEMBIC_DATABASE_URL (Project Settings -> Database -> Direct
# connection, port 5432).
#
# NOTE: this is intentionally kept as a plain Python variable, never passed
# through config.set_main_option()/configparser — a password containing
# percent-encoded characters (e.g. %21 for "!") trips configparser's own
# %-interpolation syntax. create_engine() below is given the raw string
# directly instead.
db_url = os.environ["ALEMBIC_DATABASE_URL"]
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

target_metadata = None


def run_migrations_offline() -> None:
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(db_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()