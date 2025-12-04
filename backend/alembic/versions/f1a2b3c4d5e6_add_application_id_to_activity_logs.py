"""Add application_id to activity_logs

Revision ID: f1a2b3c4d5e6
Revises: ce79b0438e01
Create Date: 2024-12-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = 'ce79b0438e01'
branch_labels = None
depends_on = None


def upgrade():
    # Add application_id column to activity_logs
    op.add_column('activity_logs', sa.Column('application_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_activity_logs_application_id',
        'activity_logs', 'applications',
        ['application_id'], ['id']
    )
    
    # Add index for faster lookups
    op.create_index('ix_activity_logs_application_id', 'activity_logs', ['application_id'])


def downgrade():
    op.drop_index('ix_activity_logs_application_id', table_name='activity_logs')
    op.drop_constraint('fk_activity_logs_application_id', 'activity_logs', type_='foreignkey')
    op.drop_column('activity_logs', 'application_id')
