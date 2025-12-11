"""Add status column to interviews

Revision ID: h3c4d5e6f7g8
Revises: ce79b0438e01
Create Date: 2024-12-06

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'h3c4d5e6f7g8'
down_revision = 'g2b3c4d5e6f7'
branch_labels = None
depends_on = None


def upgrade():
    # Add status column with default value, make existing records 'Completed'
    op.add_column('interviews', sa.Column('status', sa.String(), nullable=True))
    
    # Update existing records to have a status based on outcome
    op.execute("""
        UPDATE interviews 
        SET status = CASE 
            WHEN outcome IS NOT NULL AND outcome != '' AND outcome != 'Pending' THEN 'Completed'
            WHEN scheduled_at IS NOT NULL AND scheduled_at > NOW() THEN 'Scheduled'
            ELSE 'Completed'
        END
    """)
    
    # Create index for performance
    op.create_index('ix_interviews_status', 'interviews', ['status'])


def downgrade():
    op.drop_index('ix_interviews_status', table_name='interviews')
    op.drop_column('interviews', 'status')
