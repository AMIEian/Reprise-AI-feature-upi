"""make udyam_id not nullable

Revision ID: d4e5f6g7h8
Revises: a1b2c3d4e5f6
Create Date: 2026-03-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd4e5f6g7h8'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure no NULL udyam_id values exist
    op.execute("UPDATE partners SET udyam_id = '' WHERE udyam_id IS NULL")
    op.alter_column('partners', 'udyam_id', existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    op.alter_column('partners', 'udyam_id', existing_type=sa.String(), nullable=True)
