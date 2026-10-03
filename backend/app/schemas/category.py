from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    is_active: bool | None = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)