"""Add landing page fields to Job and tracking_data to Application

Revision ID: lp01_landing_page
Revises: h3c4d5e6f7g8
Create Date: 2025-12-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'lp01_landing_page'
down_revision = '3e5ad0e93fee'
branch_labels = None
depends_on = None


def upgrade():
    # Add landing page fields to jobs table
    op.add_column('jobs', sa.Column('landing_page_enabled', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('jobs', sa.Column('landing_page_slug', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('landing_page_config', sa.Text(), nullable=True))
    
    # Create unique index for slug
    op.create_index('ix_jobs_landing_page_slug', 'jobs', ['landing_page_slug'], unique=True)
    
    # Add tracking_data to applications table
    op.add_column('applications', sa.Column('tracking_data', sa.Text(), nullable=True))


def downgrade():
    # Remove tracking_data from applications
    op.drop_column('applications', 'tracking_data')
    
    # Remove landing page fields from jobs
    op.drop_index('ix_jobs_landing_page_slug', table_name='jobs')
    op.drop_column('jobs', 'landing_page_config')
    op.drop_column('jobs', 'landing_page_slug')
    op.drop_column('jobs', 'landing_page_enabled')
