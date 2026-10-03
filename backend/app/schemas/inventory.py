from pydantic import BaseModel, Field


class InventoryAdjustRequest(BaseModel):
    quantity: int = Field(gt=0)


class InventoryResponse(BaseModel):
    id: int
    variant_id: int
    stock_quantity: int
    reserved_quantity: int
    sold_quantity: int
    available_quantity: int