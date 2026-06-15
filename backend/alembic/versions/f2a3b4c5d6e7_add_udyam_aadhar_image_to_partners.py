"""add_udyam_aadhar_image_to_partners

Revision ID: f2a3b4c5d6e7
Revises: e1f3a2b4c5d6
Create Date: 2026-03-06 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1f3a2b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add udyam_aadhar_image column to partners table."""
    op.add_column('partners', sa.Column('udyam_aadhar_image', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove udyam_aadhar_image column from partners table."""
    op.drop_column('partners', 'udyam_aadhar_image')
