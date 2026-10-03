from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import Inventory, ProductVariant
from app.schemas import InventoryAdjustRequest, InventoryReservationRequest, InventoryResponse


router = APIRouter(
    prefix="/api/variants/{variant_id}/inventory",
    tags=["Inventory"],
)


def get_variant_or_404(
    variant_id: int,
    db: Session,
) -> ProductVariant:
    variant = db.get(ProductVariant, variant_id)

    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found.",
        )

    return variant


def get_inventory_or_404(
    variant_id: int,
    db: Session,
) -> Inventory:
    inventory = db.scalar(
        select(Inventory).where(
            Inventory.variant_id == variant_id
        )
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found.",
        )

    return inventory


def inventory_response(inventory: Inventory) -> dict:
    return {
        "id": inventory.id,
        "variant_id": inventory.variant_id,
        "stock_quantity": inventory.stock_quantity,
        "reserved_quantity": inventory.reserved_quantity,
        "sold_quantity": inventory.sold_quantity,
        "available_quantity": inventory.available_quantity,
    }


@router.get(
    "",
    response_model=InventoryResponse,
)
def get_inventory(
    variant_id: int,
    db: Session = Depends(get_db),
):
    get_variant_or_404(variant_id, db)

    inventory = get_inventory_or_404(
        variant_id,
        db,
    )

    return inventory_response(inventory)


@router.post(
    "/increase",
    response_model=InventoryResponse,
)
def increase_inventory(
    variant_id: int,
    adjustment: InventoryAdjustRequest,
    db: Session = Depends(get_db),
):
    variant = get_variant_or_404(
        variant_id,
        db,
    )

    if not variant.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify inventory for an inactive variant.",
        )

    inventory = get_inventory_or_404(
        variant_id,
        db,
    )

    inventory.stock_quantity += adjustment.quantity

    db.commit()
    db.refresh(inventory)

    return inventory_response(inventory)


@router.post(
    "/decrease",
    response_model=InventoryResponse,
)
def decrease_inventory(
    variant_id: int,
    adjustment: InventoryAdjustRequest,
    db: Session = Depends(get_db),
):
    variant = get_variant_or_404(
        variant_id,
        db,
    )

    if not variant.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify inventory for an inactive variant.",
        )

    inventory = get_inventory_or_404(
        variant_id,
        db,
    )

    available_quantity = inventory.available_quantity

    if adjustment.quantity > available_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot decrease stock by {adjustment.quantity}. "
                f"Only {available_quantity} units are available."
            ),
        )

    inventory.stock_quantity -= adjustment.quantity

    db.commit()
    db.refresh(inventory)

    return inventory_response(inventory)


@router.post(
    "/reserve",
    response_model=InventoryResponse,
)
def reserve_inventory(
    variant_id: int,
    reservation: InventoryReservationRequest,
    db: Session = Depends(get_db),
):
    get_variant_or_404(variant_id, db)

    inventory = db.scalar(
        select(Inventory)
        .where(Inventory.variant_id == variant_id)
        .with_for_update()
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found.",
        )

    if reservation.quantity > inventory.available_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot reserve {reservation.quantity} units. "
                f"Only {inventory.available_quantity} units are available."
            ),
        )

    inventory.reserved_quantity += reservation.quantity

    db.commit()
    db.refresh(inventory)

    return inventory_response(inventory)


@router.post(
    "/release",
    response_model=InventoryResponse,
)
def release_inventory(
    variant_id: int,
    reservation: InventoryReservationRequest,
    db: Session = Depends(get_db),
):
    get_variant_or_404(variant_id, db)

    inventory = db.scalar(
        select(Inventory)
        .where(Inventory.variant_id == variant_id)
        .with_for_update()
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found.",
        )

    if reservation.quantity > inventory.reserved_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot release {reservation.quantity} units. "
                f"Only {inventory.reserved_quantity} units are reserved."
            ),
        )

    inventory.reserved_quantity -= reservation.quantity

    db.commit()
    db.refresh(inventory)

    return inventory_response(inventory)