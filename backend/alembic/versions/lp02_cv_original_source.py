"""Add original_source to CV model

Revision ID: lp02_cv_original_source
Revises: lp01_landing_page
Create Date: 2024-12-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'lp02_cv_original_source'
down_revision = 'lp01_landing_page'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add original_source column to CVs table
    # This tracks how the CV entered the system: "manual", "landing_page", "api", etc.
    op.add_column('cvs', sa.Column('original_source', sa.String(), nullable=True))
    
    # Set default value for existing CVs to "manual" (they were uploaded by users)
    op.execute("UPDATE cvs SET original_source = 'manual' WHERE original_source IS NULL")


def downgrade() -> None:
    op.drop_column('cvs', 'original_source')
