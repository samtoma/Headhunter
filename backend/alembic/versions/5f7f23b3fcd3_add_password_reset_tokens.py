"""add_password_reset_tokens

Revision ID: 5f7f23b3fcd3
Revises: 385682283dd6
Create Date: 2025-12-07 11:00:29.523330

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5f7f23b3fcd3'
down_revision: Union[str, Sequence[str], None] = '385682283dd6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
