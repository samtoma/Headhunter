"""Add full_name to users

Revision ID: 385682283dd6
Revises: h3c4d5e6f7g8
Create Date: 2025-12-06 22:40:50.207291

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "385682283dd6"
down_revision: Union[str, Sequence[str], None] = "h3c4d5e6f7g8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add full_name column to users table
    op.add_column("users", sa.Column("full_name", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove full_name column from users table
    op.drop_column("users", "full_name")
