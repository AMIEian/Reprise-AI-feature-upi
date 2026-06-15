"""populate search_vector for phones_list and add trigger

Revision ID: h1i2j3k4l5
Revises: d4e5f6g7h8, f2a3b4c5d6e7
Create Date: 2026-03-06 12:00:00.000000

NOTE: Merges the two previous heads (d4e5f6g7h8 and f2a3b4c5d6e7) and:
  1. Ensures the search_vector tsvector column exists
  2. Backfills all NULL rows
  3. Creates a GIN index on it
  4. Installs a DB-level trigger so any direct SQL insert/update also keeps it populated
"""
from typing import Sequence, Union
from alembic import op

revision: str = "h1i2j3k4l5"
down_revision: Union[str, Sequence[str], None] = ("d4e5f6g7h8", "f2a3b4c5d6e7")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add the column if it doesn't already exist
    op.execute("""
        ALTER TABLE phones_list
        ADD COLUMN IF NOT EXISTS search_vector tsvector;
    """)

    # 2. Backfill all rows that currently have NULL
    op.execute("""
        UPDATE phones_list
        SET search_vector = to_tsvector('english',
            coalesce("Brand", '')   || ' ' ||
            coalesce("Series", '')  || ' ' ||
            coalesce("Model", '')   || ' ' ||
            coalesce("Storage_Raw", '')
        )
        WHERE search_vector IS NULL;
    """)

    # 3. GIN index for fast full-text lookups
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_phones_list_search_vector
        ON phones_list USING GIN (search_vector);
    """)

    # 4. Trigger function — fires on every INSERT or UPDATE so even direct SQL writes are covered
    op.execute("""
        CREATE OR REPLACE FUNCTION phones_list_search_vector_update()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector := to_tsvector('english',
                coalesce(NEW."Brand", '')        || ' ' ||
                coalesce(NEW."Series", '')       || ' ' ||
                coalesce(NEW."Model", '')        || ' ' ||
                coalesce(NEW."Storage_Raw", '')
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        DROP TRIGGER IF EXISTS phones_list_search_vector_trigger ON phones_list;
    """)

    op.execute("""
        CREATE TRIGGER phones_list_search_vector_trigger
        BEFORE INSERT OR UPDATE ON phones_list
        FOR EACH ROW
        EXECUTE FUNCTION phones_list_search_vector_update();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS phones_list_search_vector_trigger ON phones_list;")
    op.execute("DROP FUNCTION IF EXISTS phones_list_search_vector_update();")
    op.execute("DROP INDEX IF EXISTS idx_phones_list_search_vector;")
    op.execute("ALTER TABLE phones_list DROP COLUMN IF EXISTS search_vector;")
