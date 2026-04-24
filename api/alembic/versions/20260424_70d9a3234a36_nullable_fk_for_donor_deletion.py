"""nullable_fk_for_donor_deletion

Revision ID: 70d9a3234a36
Revises: ed2f084bbceb
Create Date: 2026-04-24 19:17:58.510576

Allow breeding_log.parent_f_id / parent_m_id and clone_log.donor_1_id / donor_2_id
to be NULL and use ON DELETE SET NULL so that sterile donor muldos can be hard-deleted
during the auto-clone process without violating FK constraints.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '70d9a3234a36'
down_revision: Union[str, None] = 'ed2f084bbceb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # breeding_log: drop existing FK constraints, make columns nullable,
    # recreate with ON DELETE SET NULL
    op.drop_constraint('breeding_log_parent_f_id_fkey', 'breeding_log', type_='foreignkey')
    op.drop_constraint('breeding_log_parent_m_id_fkey', 'breeding_log', type_='foreignkey')
    op.alter_column('breeding_log', 'parent_f_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('breeding_log', 'parent_m_id', existing_type=sa.Integer(), nullable=True)
    op.create_foreign_key(
        'breeding_log_parent_f_id_fkey', 'breeding_log', 'muldo_individual',
        ['parent_f_id'], ['id'], ondelete='SET NULL',
    )
    op.create_foreign_key(
        'breeding_log_parent_m_id_fkey', 'breeding_log', 'muldo_individual',
        ['parent_m_id'], ['id'], ondelete='SET NULL',
    )

    # clone_log: drop existing FK constraints, make columns nullable,
    # recreate with ON DELETE SET NULL
    op.drop_constraint('clone_log_donor_1_id_fkey', 'clone_log', type_='foreignkey')
    op.drop_constraint('clone_log_donor_2_id_fkey', 'clone_log', type_='foreignkey')
    op.alter_column('clone_log', 'donor_1_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('clone_log', 'donor_2_id', existing_type=sa.Integer(), nullable=True)
    op.create_foreign_key(
        'clone_log_donor_1_id_fkey', 'clone_log', 'muldo_individual',
        ['donor_1_id'], ['id'], ondelete='SET NULL',
    )
    op.create_foreign_key(
        'clone_log_donor_2_id_fkey', 'clone_log', 'muldo_individual',
        ['donor_2_id'], ['id'], ondelete='SET NULL',
    )

    # muldo_individual self-referential FKs: recreate with ON DELETE SET NULL
    op.drop_constraint('fk_muldo_individual_parent_f', 'muldo_individual', type_='foreignkey')
    op.drop_constraint('fk_muldo_individual_parent_m', 'muldo_individual', type_='foreignkey')
    op.create_foreign_key(
        'fk_muldo_individual_parent_f', 'muldo_individual', 'muldo_individual',
        ['parent_f_id'], ['id'], ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_muldo_individual_parent_m', 'muldo_individual', 'muldo_individual',
        ['parent_m_id'], ['id'], ondelete='SET NULL',
    )


def downgrade() -> None:
    # Revert muldo_individual self-referential FKs
    op.drop_constraint('fk_muldo_individual_parent_f', 'muldo_individual', type_='foreignkey')
    op.drop_constraint('fk_muldo_individual_parent_m', 'muldo_individual', type_='foreignkey')
    op.create_foreign_key('fk_muldo_individual_parent_f', 'muldo_individual', 'muldo_individual',
                          ['parent_f_id'], ['id'])
    op.create_foreign_key('fk_muldo_individual_parent_m', 'muldo_individual', 'muldo_individual',
                          ['parent_m_id'], ['id'])

    # Revert clone_log
    op.drop_constraint('clone_log_donor_2_id_fkey', 'clone_log', type_='foreignkey')
    op.drop_constraint('clone_log_donor_1_id_fkey', 'clone_log', type_='foreignkey')
    op.alter_column('clone_log', 'donor_2_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('clone_log', 'donor_1_id', existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key('clone_log_donor_1_id_fkey', 'clone_log', 'muldo_individual',
                          ['donor_1_id'], ['id'])
    op.create_foreign_key('clone_log_donor_2_id_fkey', 'clone_log', 'muldo_individual',
                          ['donor_2_id'], ['id'])

    # Revert breeding_log
    op.drop_constraint('breeding_log_parent_m_id_fkey', 'breeding_log', type_='foreignkey')
    op.drop_constraint('breeding_log_parent_f_id_fkey', 'breeding_log', type_='foreignkey')
    op.alter_column('breeding_log', 'parent_m_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('breeding_log', 'parent_f_id', existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key('breeding_log_parent_f_id_fkey', 'breeding_log', 'muldo_individual',
                          ['parent_f_id'], ['id'])
    op.create_foreign_key('breeding_log_parent_m_id_fkey', 'breeding_log', 'muldo_individual',
                          ['parent_m_id'], ['id'])
