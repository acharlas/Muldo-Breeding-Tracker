"""clone_log_result_id_nullable_on_delete_set_null

Revision ID: adb2c761154c
Revises: 70d9a3234a36
Create Date: 2026-04-26 08:39:17.184049

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'adb2c761154c'
down_revision: Union[str, None] = '70d9a3234a36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop whichever FK name Postgres assigned to clone_log.result_id, then
    # recreate with ON DELETE SET NULL and allow NULL.
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = 'clone_log'
                  AND constraint_type = 'FOREIGN KEY'
                  AND constraint_name LIKE '%result_id%'
            LOOP
                EXECUTE 'ALTER TABLE clone_log DROP CONSTRAINT ' || quote_ident(r.constraint_name);
            END LOOP;
        END$$;
    """)
    op.alter_column('clone_log', 'result_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)
    op.create_foreign_key(
        'clone_log_result_id_fkey', 'clone_log', 'muldo_individual',
        ['result_id'], ['id'], ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('clone_log_result_id_fkey', 'clone_log', type_='foreignkey')
    op.alter_column('clone_log', 'result_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
    op.create_foreign_key(
        'clone_log_result_id_fkey', 'clone_log', 'muldo_individual',
        ['result_id'], ['id']
    )
