"""add configurable workflows

Revision ID: f8e9a4c4dad1
Revises: e7d9a4c4dad0
Create Date: 2025-11-27 20:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f8e9a4c4dad1'
down_revision = 'e7d9a4c4dad0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add interview_stages to companies
    op.add_column('companies', sa.Column('interview_stages', sa.Text(), nullable=True))
    
    # Add custom_data to interviews
    op.add_column('interviews', sa.Column('custom_data', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove custom_data from interviews
    op.drop_column('interviews', 'custom_data')
    
    # Remove interview_stages from companies
    op.drop_column('companies', 'interview_stages')
