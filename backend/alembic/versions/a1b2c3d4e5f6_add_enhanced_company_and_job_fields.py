"""add enhanced company and job fields

Revision ID: a1b2c3d4e5f6
Revises: f8e9a4c4dad1
Create Date: 2025-11-28 18:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f8e9a4c4dad1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add enhanced company fields
    op.add_column('companies', sa.Column('tagline', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('founded_year', sa.Integer(), nullable=True))
    op.add_column('companies', sa.Column('company_size', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('headquarters', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('company_type', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('specialties', sa.Text(), nullable=True))
    op.add_column('companies', sa.Column('mission', sa.Text(), nullable=True))
    op.add_column('companies', sa.Column('vision', sa.Text(), nullable=True))
    op.add_column('companies', sa.Column('values', sa.Text(), nullable=True))
    op.add_column('companies', sa.Column('products_services', sa.Text(), nullable=True))
    op.add_column('companies', sa.Column('target_market', sa.Text(), nullable=True))
    op.add_column('companies', sa.Column('competitive_advantage', sa.Text(), nullable=True))
    op.add_column('companies', sa.Column('social_linkedin', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('social_twitter', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('social_facebook', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('logo_url', sa.String(), nullable=True))
    
    # Add enhanced job fields
    op.add_column('jobs', sa.Column('location', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('employment_type', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('salary_range', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('responsibilities', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('qualifications', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('preferred_qualifications', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('benefits', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('team_info', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('growth_opportunities', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('application_process', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('remote_policy', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove enhanced job fields
    op.drop_column('jobs', 'remote_policy')
    op.drop_column('jobs', 'application_process')
    op.drop_column('jobs', 'growth_opportunities')
    op.drop_column('jobs', 'team_info')
    op.drop_column('jobs', 'benefits')
    op.drop_column('jobs', 'preferred_qualifications')
    op.drop_column('jobs', 'qualifications')
    op.drop_column('jobs', 'responsibilities')
    op.drop_column('jobs', 'salary_range')
    op.drop_column('jobs', 'employment_type')
    op.drop_column('jobs', 'location')
    
    # Remove enhanced company fields
    op.drop_column('companies', 'logo_url')
    op.drop_column('companies', 'social_facebook')
    op.drop_column('companies', 'social_twitter')
    op.drop_column('companies', 'social_linkedin')
    op.drop_column('companies', 'competitive_advantage')
    op.drop_column('companies', 'target_market')
    op.drop_column('companies', 'products_services')
    op.drop_column('companies', 'values')
    op.drop_column('companies', 'vision')
    op.drop_column('companies', 'mission')
    op.drop_column('companies', 'specialties')
    op.drop_column('companies', 'company_type')
    op.drop_column('companies', 'headquarters')
    op.drop_column('companies', 'company_size')
    op.drop_column('companies', 'founded_year')
    op.drop_column('companies', 'tagline')
