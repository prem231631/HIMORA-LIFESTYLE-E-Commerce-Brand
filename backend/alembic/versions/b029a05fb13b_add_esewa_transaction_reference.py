"""add esewa transaction reference

Revision ID: b029a05fb13b
Revises: 43891bdf2540
Create Date: 2026-10-15 11:51:18.707074

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b029a05fb13b'
down_revision: Union[str, Sequence[str], None] = '43891bdf2540'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payments",
        sa.Column(
            "transaction_uuid",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.create_index(
        op.f("ix_payments_transaction_uuid"),
        "payments",
        ["transaction_uuid"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_payments_transaction_uuid"),
        table_name="payments",
    )

    op.drop_column("payments", "transaction_uuid")
