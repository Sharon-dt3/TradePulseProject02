"""Phase 12: add portfolio_value to risk_snapshots

Revision ID: 0002_risk_snapshots_portfolio_value
Revises: 0001_risk_baseline
Create Date: 2026-09-07

risk_recompute_service.py already computes portfolio_value for every
snapshot (it's the denominator for VaR/volatility) and persists it to
pv_history for Sharpe's return series - but until now that same number
was discarded rather than stored alongside the snapshot it belongs to.
Nullable since existing rows have no value; every new snapshot from
risk_recompute_service.py always sets it going forward.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_add_portfolio_value"
down_revision: Union[str, None] = "0001_risk_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE risk_snapshots ADD COLUMN portfolio_value numeric(19,4)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE risk_snapshots DROP COLUMN portfolio_value")
