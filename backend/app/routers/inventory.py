from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import require_admin
from app.database.session import get_db
from app.models import Inventory, Product, ProductVariant


router = APIRouter(
    prefix="/api/inventory",
    tags=["Inventory Management"],
)


class InventoryUpdateRequest(BaseModel):
    stock_quantity: int = Field(ge=0)
    reserved_quantity: int | None = Field(default=None, ge=0)
    sold_quantity: int | None = Field(default=None, ge=0)


class InventoryResponse(BaseModel):
    id: int
    variant_id: int
    stock_quantity: int
    reserved_quantity: int
    sold_quantity: int
    available_quantity: int

    model_config = ConfigDict(from_attributes=True)


class AdminInventoryResponse(BaseModel):
    id: int
    variant_id: int
    sku: str
    product_id: int
    product_name: str
    size: str | None
    color: str | None
    stock_quantity: int
    reserved_quantity: int
    sold_quantity: int
    available_quantity: int

    model_config = ConfigDict(from_attributes=True)


def _inventory_response(inventory: Inventory) -> AdminInventoryResponse:
    variant = inventory.variant
    product = variant.product

    return AdminInventoryResponse(
        id=inventory.id,
        variant_id=variant.id,
        sku=variant.sku,
        product_id=product.id,
        product_name=product.name,
        size=variant.size,
        color=variant.color,
        stock_quantity=inventory.stock_quantity,
        reserved_quantity=inventory.reserved_quantity,
        sold_quantity=inventory.sold_quantity,
        available_quantity=max(
            inventory.stock_quantity - inventory.reserved_quantity,
            0,
        ),
    )


@router.get(
    "/admin",
    response_model=list[AdminInventoryResponse],
)
def get_inventory(
    search: str | None = Query(default=None, max_length=150),
    product_id: int | None = Query(default=None, ge=1),
    low_stock: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
):
    statement = (
        select(Inventory)
        .join(Inventory.variant)
        .join(ProductVariant.product)
        .options(
            selectinload(Inventory.variant).selectinload(
                ProductVariant.product
            )
        )
        .order_by(Inventory.id.desc())
    )

    if product_id is not None:
        statement = statement.where(Product.id == product_id)

    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Product.name.ilike(term),
                ProductVariant.sku.ilike(term),
                ProductVariant.size.ilike(term),
                ProductVariant.color.ilike(term),
            )
        )

    inventories = db.scalars(statement.offset(skip).limit(limit)).all()

    results = [_inventory_response(item) for item in inventories]

    if low_stock:
        results = [
            item
            for item in results
            if item.available_quantity <= 5
        ]

    return results


@router.get(
    "/admin/{inventory_id}",
    response_model=AdminInventoryResponse,
)
def get_inventory_item(
    inventory_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
):
    statement = (
        select(Inventory)
        .where(Inventory.id == inventory_id)
        .options(
            selectinload(Inventory.variant).selectinload(
                ProductVariant.product
            )
        )
    )

    inventory = db.scalar(statement)

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    return _inventory_response(inventory)


@router.patch(
    "/admin/{inventory_id}",
    response_model=AdminInventoryResponse,
)
def update_inventory(
    inventory_id: int,
    payload: InventoryUpdateRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
):
    inventory = db.scalar(
        select(Inventory)
        .where(Inventory.id == inventory_id)
        .options(
            selectinload(Inventory.variant).selectinload(
                ProductVariant.product
            )
        )
        .with_for_update()
    )

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    reserved_quantity = (
        payload.reserved_quantity
        if payload.reserved_quantity is not None
        else inventory.reserved_quantity
    )

    sold_quantity = (
        payload.sold_quantity
        if payload.sold_quantity is not None
        else inventory.sold_quantity
    )

    if reserved_quantity > payload.stock_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reserved quantity cannot exceed stock quantity.",
        )

    if sold_quantity > payload.stock_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sold quantity cannot exceed stock quantity.",
        )

    inventory.stock_quantity = payload.stock_quantity
    inventory.reserved_quantity = reserved_quantity
    inventory.sold_quantity = sold_quantity

    db.commit()
    db.refresh(inventory)

    return _inventory_response(inventory)


@router.post(
    "/admin/{inventory_id}/adjust",
    response_model=AdminInventoryResponse,
)
def adjust_inventory(
    inventory_id: int,
    quantity_change: int = Query(
        ...,
        description="Positive to add stock; negative to remove stock.",
    ),
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
):
    inventory = db.scalar(
        select(Inventory)
        .where(Inventory.id == inventory_id)
        .options(
            selectinload(Inventory.variant).selectinload(
                ProductVariant.product
            )
        )
        .with_for_update()
    )

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    updated_stock = inventory.stock_quantity + quantity_change

    if updated_stock < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock quantity cannot become negative.",
        )

    if updated_stock < inventory.reserved_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock cannot be lower than the reserved quantity.",
        )

    inventory.stock_quantity = updated_stock

    db.commit()
    db.refresh(inventory)

    return _inventory_response(inventory)