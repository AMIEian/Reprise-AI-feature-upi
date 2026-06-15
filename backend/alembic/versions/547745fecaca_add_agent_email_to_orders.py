"""add_agent_email_to_orders

Revision ID: 547745fecaca
Revises: 03587456e973
Create Date: 2026-01-23 13:31:11.724675

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '547745fecaca'
down_revision: Union[str, Sequence[str], None] = '03587456e973'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
