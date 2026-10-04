from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.order_item import OrderItem
    from app.models.order_status_history import OrderStatusHistory
    from app.models.user import User


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    order_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
    )

    payment_method: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="CASH_ON_DELIVERY",
    )

    payment_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    shipping_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    shipping_full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    shipping_phone: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    shipping_province: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    shipping_city: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    shipping_address_line: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    shipping_landmark: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    shipping_postal_code: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
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

    user: Mapped["User"] = relationship(
        "User",
    )

    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )

    status_history: Mapped[list["OrderStatusHistory"]] = relationship(
        "OrderStatusHistory",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderStatusHistory.created_at",
    )