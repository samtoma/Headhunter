"""add_stage_feedback_to_interviews

Revision ID: 8b759d4ffc50
Revises: d2a207814b9d
Create Date: 2025-12-12 17:52:02.254916

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b759d4ffc50'
down_revision: Union[str, Sequence[str], None] = 'd2a207814b9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Add stage_feedback column to interviews table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('interviews')]
    
    # Only add column if it doesn't exist (idempotent)
    if 'stage_feedback' not in columns:
        op.add_column('interviews', sa.Column('stage_feedback', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema: Remove stage_feedback column from interviews table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('interviews')]
    
    # Only drop column if it exists (idempotent)
    if 'stage_feedback' in columns:
        op.drop_column('interviews', 'stage_feedback')
