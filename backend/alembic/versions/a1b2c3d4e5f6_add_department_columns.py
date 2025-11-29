"""add department columns

Revision ID: a1b2c3d4e5f6
Revises: 961c935bb98a
Create Date: 2025-11-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '961c935bb98a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Get inspector
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Add department column to users table if not exists
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'department' not in columns:
        op.add_column('users', sa.Column('department', sa.String(), nullable=True))
    
    # Add department column to jobs table if not exists
    columns = [c['name'] for c in inspector.get_columns('jobs')]
    if 'department' not in columns:
        op.add_column('jobs', sa.Column('department', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove department column from jobs table
    op.drop_column('jobs', 'department')
    
    # Remove department column from users table
    op.drop_column('users', 'department')
