"""Add composite indexes for system_logs performance

Revision ID: 3b5f7a8c9d2e
Revises: ccb0d9fd7e5b
Create Date: 2025-12-21

"""


# revision identifiers, used by Alembic.
revision = '3b5f7a8c9d2e'
down_revision = 'ccb0d9fd7e5b'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add composite indexes for common query patterns in system_logs table.
    
    NOTE: This migration is a no-op because system_logs table is in the logs database,
    not the main database. The composite indexes are created by the unified_log_worker
    in its create_tables() function when it starts up.
    
    This migration is kept for historical reference and to maintain migration chain,
    but it does not execute any operations.
    """
    # No-op: Indexes are created by unified_log_worker.create_tables()
    # which runs against the logs database, not the main database
    pass


def downgrade():
    """
    Remove the composite indexes.
    
    NOTE: This is a no-op because system_logs table is in the logs database.
    Indexes are managed by the unified_log_worker, not by Alembic migrations.
    """
    # No-op: Indexes are managed by unified_log_worker, not Alembic
    pass
