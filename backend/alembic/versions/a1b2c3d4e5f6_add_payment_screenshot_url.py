"""add payment_screenshot_url to partner_payment_requests

Revision ID: a1b2c3d4e5f6
Revises: f2a3b4c5d6e7
Create Date: 2024-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'partner_payment_requests',
        sa.Column('payment_screenshot_url', sa.String(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('partner_payment_requests', 'payment_screenshot_url')
