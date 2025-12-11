"""add_created_at_to_interviews

Revision ID: d2a207814b9d
Revises: 5f7f23b3fcd3
Create Date: 2025-12-11 18:18:34.030607

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2a207814b9d'
down_revision: Union[str, Sequence[str], None] = '5f7f23b3fcd3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add created_at column to interviews table."""
    # Check if column already exists before adding (for idempotency)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('interviews')]
    
    if 'created_at' not in columns:
        op.add_column('interviews', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False))


def downgrade() -> None:
    """Downgrade schema - Remove created_at column from interviews table."""
    # Check if column exists before dropping (for idempotency)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('interviews')]
    
    if 'created_at' in columns:
        op.drop_column('interviews', 'created_at')
