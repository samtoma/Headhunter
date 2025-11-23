"""Add Job Requirements

Revision ID: 3144177651a7
Revises: 8ff4227ce259
Create Date: 2025-11-23 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '3144177651a7'
down_revision: Union[str, Sequence[str], None] = '8ff4227ce259'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('jobs', sa.Column('required_experience', sa.Integer(), server_default='0', nullable=True))
    op.add_column('jobs', sa.Column('skills_required', sa.Text(), nullable=True))

def downgrade() -> None:
    op.drop_column('jobs', 'skills_required')
    op.drop_column('jobs', 'required_experience')