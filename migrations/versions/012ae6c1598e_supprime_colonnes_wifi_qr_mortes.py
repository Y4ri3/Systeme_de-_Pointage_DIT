"""supprime colonnes wifi_detecte et qr_valide (code mort)

Revision ID: 012ae6c1598e
Revises: ce09f258c38a
Create Date: 2026-07-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '012ae6c1598e'
down_revision = 'ce09f258c38a'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('pointages', schema=None) as batch_op:
        batch_op.drop_column('wifi_detecte')
        batch_op.drop_column('qr_valide')


def downgrade():
    with op.batch_alter_table('pointages', schema=None) as batch_op:
        batch_op.add_column(sa.Column('qr_valide', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('wifi_detecte', sa.Boolean(), nullable=True))
