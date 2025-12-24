"""Add SystemLog and UserInvitation models

Revision ID: ccb0d9fd7e5b
Revises: b731bf4fc640
Create Date: 2025-12-21 13:30:05.654760

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ccb0d9fd7e5b'
down_revision: Union[str, Sequence[str], None] = 'b731bf4fc640'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Note: system_logs and llm_logs tables are created in the logs database
    # by the unified_log_worker using LogBase.metadata.create_all()
    # They are NOT created via Alembic migrations since they use a separate database.
    # This migration only creates user_invitations in the main database.
    
    # Create user_invitations table in main database
    op.create_table(
        'user_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('invited_by', sa.Integer(), nullable=False),
        sa.Column('invited_user_id', sa.Integer(), nullable=True),
        sa.Column('email_sent', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('email_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('email_error', sa.Text(), nullable=True),
        sa.Column('extra_metadata', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['invited_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    op.create_index(op.f('ix_user_invitations_id'), 'user_invitations', ['id'], unique=False)
    op.create_index(op.f('ix_user_invitations_email'), 'user_invitations', ['email'], unique=False)
    op.create_index(op.f('ix_user_invitations_token'), 'user_invitations', ['token'], unique=False)
    op.create_index(op.f('ix_user_invitations_company_id'), 'user_invitations', ['company_id'], unique=False)
    op.create_index(op.f('ix_user_invitations_status'), 'user_invitations', ['status'], unique=False)
    op.create_index(op.f('ix_user_invitations_expires_at'), 'user_invitations', ['expires_at'], unique=False)
    op.create_index(op.f('ix_user_invitations_created_at'), 'user_invitations', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Note: system_logs and llm_logs are managed separately in the logs database
    # and are not part of this migration's downgrade
    op.drop_index(op.f('ix_user_invitations_created_at'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_expires_at'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_status'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_company_id'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_token'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_email'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_id'), table_name='user_invitations')
    op.drop_table('user_invitations')
