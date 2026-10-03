from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.product_variant import ProductVariant


class CartItem(Base):
    __tablename__ = "cart_items"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    cart_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("carts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    variant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    cart: Mapped["Cart"] = relationship(
        "Cart",
        back_populates="items",
    )

    variant: Mapped["ProductVariant"] = relationship(
        "ProductVariant",
    )

    __table_args__ = (
        UniqueConstraint(
            "cart_id",
            "variant_id",
            name="uq_cart_variant",
        ),
    )