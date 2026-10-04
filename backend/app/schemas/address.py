from pydantic import BaseModel, ConfigDict, Field


class AddressCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=7, max_length=30)
    province: str = Field(min_length=2, max_length=100)
    city: str = Field(min_length=2, max_length=100)
    address_line: str = Field(min_length=3, max_length=500)
    landmark: str | None = Field(default=None, max_length=200)
    postal_code: str | None = Field(default=None, max_length=20)
    is_default: bool = False


class AddressUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    province: str | None = Field(default=None, min_length=2, max_length=100)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    address_line: str | None = Field(default=None, min_length=3, max_length=500)
    landmark: str | None = Field(default=None, max_length=200)
    postal_code: str | None = Field(default=None, max_length=20)
    is_default: bool | None = None


class AddressResponse(BaseModel):
    id: int
    full_name: str
    phone: str
    province: str
    city: str
    address_line: str
    landmark: str | None
    postal_code: str | None
    is_default: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)