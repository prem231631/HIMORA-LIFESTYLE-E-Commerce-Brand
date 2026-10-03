from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


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


class ProductCreate(BaseModel):
    category_id: int | None = None
    name: str = Field(min_length=2, max_length=255)
    slug: str = Field(min_length=2, max_length=255)
    description: str | None = None
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)

    is_active: bool = True
    is_featured: bool = False
    is_new: bool = False
    is_limited: bool = False


class ProductUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )
    slug: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )
    description: str | None = None
    price: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    is_active: bool | None = None
    is_featured: bool | None = None
    is_new: bool | None = None
    is_limited: bool | None = None


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