from pydantic import BaseModel, ConfigDict, Field


class InventoryResponse(BaseModel):
    id: int
    stock_quantity: int
    reserved_quantity: int
    sold_quantity: int
    available_quantity: int

    model_config = ConfigDict(from_attributes=True)


class ProductVariantCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=100)
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=100)
    is_active: bool = True

    stock_quantity: int = Field(default=0, ge=0)


class ProductVariantUpdate(BaseModel):
    sku: str | None = Field(default=None, min_length=2, max_length=100)
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None


class ProductVariantResponse(BaseModel):
    id: int
    product_id: int
    sku: str
    size: str | None = None
    color: str | None = None
    is_active: bool
    inventory: InventoryResponse | None = None

    model_config = ConfigDict(from_attributes=True)