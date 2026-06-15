"""add oauth fields to user table

Revision ID: 7805522eb936
Revises: 3ea6c39c5d5a
Create Date: 2026-01-08 17:41:42.256908

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7805522eb936'
down_revision: Union[str, Sequence[str], None] = '3ea6c39c5d5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add OAuth fields to users table
    op.add_column('users', sa.Column('google_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('oauth_provider', sa.String(), nullable=True))
    
    # Make hashed_password nullable for OAuth users
    op.alter_column('users', 'hashed_password', nullable=True)
    
    # Create unique index on google_id
    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove index
    op.drop_index('ix_users_google_id', table_name='users')
    
    # Remove OAuth fields
    op.drop_column('users', 'oauth_provider')
    op.drop_column('users', 'google_id')
    
    # Make hashed_password not nullable again
    op.alter_column('users', 'hashed_password', nullable=False)
