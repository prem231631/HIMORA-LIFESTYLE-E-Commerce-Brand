from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict
from pydantic import Field


class CheckoutRequest(BaseModel):
    address_id: int = Field(gt=0)
    notes: str | None = Field(default=None, max_length=1000)


class OrderItemResponse(BaseModel):
    id: int
    variant_id: int
    product_name: str
    sku: str
    size: str | None
    color: str | None
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderStatusHistoryResponse(BaseModel):
    id: int
    status: str
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentResponse(BaseModel):
    id: int
    payment_method: str
    payment_status: str
    amount: Decimal
    paid_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    order_number: str
    status: str
    payment_method: str
    payment_status: str

    subtotal: Decimal
    shipping_fee: Decimal
    total_amount: Decimal

    shipping_full_name: str
    shipping_phone: str
    shipping_province: str
    shipping_city: str
    shipping_address_line: str
    shipping_landmark: str | None
    shipping_postal_code: str | None

    notes: str | None

    created_at: datetime
    updated_at: datetime

    items: list[OrderItemResponse]
    status_history: list[OrderStatusHistoryResponse]
    payment: PaymentResponse | None

    model_config = ConfigDict(from_attributes=True)

class OrderCancelRequest(BaseModel):
    reason: str | None = Field(
        default=None,
        max_length=500,
    )


class OrderStatusUpdateRequest(BaseModel):
    status: str = Field(
        min_length=1,
        max_length=30,
    )
    note: str | None = Field(
        default=None,
        max_length=500,
    )


class AdminOrderResponse(OrderResponse):
    customer_id: int
    customer_name: str
    customer_email: str
    customer_phone: str | None