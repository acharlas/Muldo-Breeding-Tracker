"""fix_parent_fk_on_delete_set_null

Revision ID: c3f1a2b8e994
Revises: 488d74589dfc
Create Date: 2026-04-26 09:15:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'c3f1a2b8e994'
down_revision: Union[str, None] = '488d74589dfc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('fk_muldo_individual_parent_f', 'muldo_individual', type_='foreignkey')
    op.drop_constraint('fk_muldo_individual_parent_m', 'muldo_individual', type_='foreignkey')
    op.create_foreign_key(
        'fk_muldo_individual_parent_f', 'muldo_individual', 'muldo_individual',
        ['parent_f_id'], ['id'], use_alter=True, ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_muldo_individual_parent_m', 'muldo_individual', 'muldo_individual',
        ['parent_m_id'], ['id'], use_alter=True, ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_muldo_individual_parent_m', 'muldo_individual', type_='foreignkey')
    op.drop_constraint('fk_muldo_individual_parent_f', 'muldo_individual', type_='foreignkey')
    op.create_foreign_key(
        'fk_muldo_individual_parent_f', 'muldo_individual', 'muldo_individual',
        ['parent_f_id'], ['id'], use_alter=True,
    )
    op.create_foreign_key(
        'fk_muldo_individual_parent_m', 'muldo_individual', 'muldo_individual',
        ['parent_m_id'], ['id'], use_alter=True,
    )
