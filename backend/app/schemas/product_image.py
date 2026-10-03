from pydantic import BaseModel, ConfigDict, Field


class ProductImageCreate(BaseModel):
    image_url: str = Field(min_length=1, max_length=500)
    alt_text: str | None = Field(default=None, max_length=255)
    is_primary: bool = False
    sort_order: int = Field(default=0, ge=0)


class ProductImageUpdate(BaseModel):
    image_url: str | None = Field(
        default=None,
        min_length=1,
        max_length=500,
    )
    alt_text: str | None = Field(
        default=None,
        max_length=255,
    )
    is_primary: bool | None = None
    sort_order: int | None = Field(
        default=None,
        ge=0,
    )


class ProductImageResponse(BaseModel):
    id: int
    product_id: int
    image_url: str
    alt_text: str | None = None
    is_primary: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)