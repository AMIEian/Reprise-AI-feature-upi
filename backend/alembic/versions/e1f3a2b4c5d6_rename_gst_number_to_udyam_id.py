"""rename_gst_number_to_udyam_id

Revision ID: e1f3a2b4c5d6
Revises: bd802697a4ad
Create Date: 2026-03-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f3a2b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'bd802697a4ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename gst_number column to udyam_id in partners table."""
    op.alter_column('partners', 'gst_number', new_column_name='udyam_id')


def downgrade() -> None:
    """Rename udyam_id column back to gst_number in partners table."""
    op.alter_column('partners', 'udyam_id', new_column_name='gst_number')
