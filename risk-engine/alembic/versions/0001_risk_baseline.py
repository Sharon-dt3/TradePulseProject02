"""Phase 0: risk-engine baseline tables

Revision ID: 0001_risk_baseline
Revises:
Create Date: 2026-09-05

Creates risk_snapshots, price_history, pv_history, applied_events directly
against Postgres — no SQLite step, this is greenfield (see BLUEPRINT.md
§7 OD-0). Correct dialect per Phase 0: GENERATED ALWAYS AS IDENTITY,
TIMESTAMPTZ, NUMERIC.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_risk_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE risk_snapshots (
            id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            account_id             uuid NOT NULL,
            var_95                 numeric(19,6),
            volatility             numeric(19,6),
            sharpe                 numeric(19,6),
            insufficient_history   boolean NOT NULL DEFAULT false,
            computed_at            timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_risk_snapshots_account_id ON risk_snapshots (account_id)"
    )

    op.execute(
        """
        CREATE TABLE price_history (
            id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            symbol        text NOT NULL,
            price         numeric(19,6) NOT NULL,
            observed_at   timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_price_history_symbol_time ON price_history (symbol, observed_at)"
    )

    op.execute(
        """
        CREATE TABLE pv_history (
            id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            account_id        uuid NOT NULL,
            portfolio_value   numeric(19,4) NOT NULL,
            observed_at       timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_pv_history_account_time ON pv_history (account_id, observed_at)"
    )

    op.execute(
        """
        CREATE TABLE applied_events (
            event_id     text PRIMARY KEY,
            applied_at   timestamptz NOT NULL DEFAULT now()
        )
        """
    )

    # Deny-by-default from the moment each table exists (Phase 0), even
    # though policies don't land until Phase 2.
    for table in ("risk_snapshots", "price_history", "pv_history", "applied_events"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS applied_events")
    op.execute("DROP TABLE IF EXISTS pv_history")
    op.execute("DROP TABLE IF EXISTS price_history")
    op.execute("DROP TABLE IF EXISTS risk_snapshots")
