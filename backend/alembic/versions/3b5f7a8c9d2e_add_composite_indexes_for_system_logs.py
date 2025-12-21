"""Add composite indexes for system_logs performance

Revision ID: 3b5f7a8c9d2e
Revises: ccb0d9fd7e5b
Create Date: 2025-12-21

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3b5f7a8c9d2e'
down_revision = 'ccb0d9fd7e5b'
branch_labels = None
depends_on = None


def upgrade():
    """Add composite indexes for common query patterns in system_logs table."""
    # Index for filtering by level and ordering by created_at (most common query pattern)
    op.create_index(
        'idx_system_logs_level_created',
        'system_logs',
        ['level', sa.text('created_at DESC')],
        unique=False
    )
    
    # Index for filtering by component and ordering by created_at
    op.create_index(
        'idx_system_logs_component_created',
        'system_logs',
        ['component', sa.text('created_at DESC')],
        unique=False
    )
    
    # Index for error queries (filtering by error_type IS NOT NULL and created_at)
    op.create_index(
        'idx_system_logs_errors',
        'system_logs',
        ['error_type', 'created_at'],
        unique=False,
        postgresql_where=sa.text('error_type IS NOT NULL')
    )


def downgrade():
    """Remove the composite indexes."""
    op.drop_index('idx_system_logs_errors', table_name='system_logs')
    op.drop_index('idx_system_logs_component_created', table_name='system_logs')
    op.drop_index('idx_system_logs_level_created', table_name='system_logs')
