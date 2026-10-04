from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base
from backend.app.models.product_variant import ProductVariant

if TYPE_CHECKING:
    from app.models.product_variant import ProductVariant
class Inventory(Base):
    __tablename__ = "inventory"

    __table_args__ = (
        CheckConstraint(
            "stock_quantity >= 0",
            name="ck_inventory_stock_non_negative",
        ),
        CheckConstraint(
            "reserved_quantity >= 0",
            name="ck_inventory_reserved_non_negative",
        ),
        CheckConstraint(
            "sold_quantity >= 0",
            name="ck_inventory_sold_non_negative",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    variant_id: Mapped[int] = mapped_column(
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    stock_quantity: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    reserved_quantity: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    sold_quantity: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    variant: Mapped["ProductVariant"] = relationship(
        "ProductVariant",
        back_populates="inventory",
    )

    @property
    def available_quantity(self) -> int:
        return max(
            self.stock_quantity - self.reserved_quantity,
            0,
        )