"""merge heads from GitHub

Revision ID: 8f91810001cd
Revises: b8d71269870d, 7805522eb936
Create Date: 2026-01-23 19:17:11.721882

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f91810001cd'
down_revision: Union[str, Sequence[str], None] = ('b8d71269870d', '7805522eb936')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
