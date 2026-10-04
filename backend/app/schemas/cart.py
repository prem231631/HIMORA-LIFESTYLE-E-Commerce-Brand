from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CartItemAdd(BaseModel):
    variant_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


class CartItemUpdate(BaseModel):
    quantity: int = Field(gt=0)


class CartItemResponse(BaseModel):
    id: int
    variant_id: int
    quantity: int

    sku: str
    product_id: int
    product_name: str
    unit_price: Decimal

    size: str | None = None
    color: str | None = None

    available_quantity: int

    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    id: int
    user_id: int
    items: list[CartItemResponse]
    total_items: int
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)