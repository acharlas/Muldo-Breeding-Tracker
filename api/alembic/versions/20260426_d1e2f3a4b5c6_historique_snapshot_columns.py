"""historique_snapshot_columns

Revision ID: d1e2f3a4b5c6
Revises: c3f1a2b8e994
Create Date: 2026-04-26 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c3f1a2b8e994'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('breeding_log', sa.Column('parent_f_species_name', sa.String(), nullable=True))
    op.add_column('breeding_log', sa.Column('parent_m_species_name', sa.String(), nullable=True))
    op.add_column('breeding_log', sa.Column('child_sex', sa.String(), nullable=True))
    op.add_column('clone_log', sa.Column('cycle_number', sa.Integer(), nullable=True))
    op.add_column('clone_log', sa.Column('species_name', sa.String(), nullable=True))
    op.add_column('clone_log', sa.Column('sex', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('clone_log', 'sex')
    op.drop_column('clone_log', 'species_name')
    op.drop_column('clone_log', 'cycle_number')
    op.drop_column('breeding_log', 'child_sex')
    op.drop_column('breeding_log', 'parent_m_species_name')
    op.drop_column('breeding_log', 'parent_f_species_name')
