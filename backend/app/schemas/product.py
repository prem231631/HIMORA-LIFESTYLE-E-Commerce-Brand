from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


class ProductImageResponse(BaseModel):
    id: int
    image_url: str
    alt_text: str | None = None
    is_primary: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None = None
    price: Decimal

    is_active: bool
    is_featured: bool
    is_new: bool
    is_limited: bool

    category: CategoryResponse | None = None
    images: list[ProductImageResponse] = []

    model_config = ConfigDict(from_attributes=True)