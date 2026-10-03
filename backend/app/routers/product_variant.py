from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database.session import get_db
from app.models import Inventory, Product, ProductVariant
from app.schemas import (
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate,
)


router = APIRouter(
    prefix="/api/products/{product_id}/variants",
    tags=["Product Variants"],
)


def variant_query():
    return (
        select(ProductVariant)
        .options(
            selectinload(ProductVariant.inventory),
        )
    )


def get_product_or_404(product_id: int, db: Session) -> Product:
    product = db.get(Product, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return product


@router.post(
    "",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product_variant(
    product_id: int,
    variant_data: ProductVariantCreate,
    db: Session = Depends(get_db),
):
    get_product_or_404(product_id, db)

    existing_variant = db.scalar(
        select(ProductVariant).where(
            ProductVariant.sku == variant_data.sku
        )
    )

    if existing_variant:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A variant with this SKU already exists.",
        )

    variant = ProductVariant(
        product_id=product_id,
        sku=variant_data.sku,
        size=variant_data.size,
        color=variant_data.color,
        is_active=variant_data.is_active,
    )

    db.add(variant)
    db.flush()

    inventory = Inventory(
        variant_id=variant.id,
        stock_quantity=variant_data.stock_quantity,
        reserved_quantity=0,
        sold_quantity=0,
    )

    db.add(inventory)

    db.commit()

    return db.scalar(
        variant_query().where(
            ProductVariant.id == variant.id
        )
    )


@router.get(
    "",
    response_model=list[ProductVariantResponse],
)
def get_product_variants(
    product_id: int,
    db: Session = Depends(get_db),
):
    get_product_or_404(product_id, db)

    statement = (
        variant_query()
        .where(ProductVariant.product_id == product_id)
        .order_by(ProductVariant.id.asc())
    )

    return db.scalars(statement).all()


@router.get(
    "/{variant_id}",
    response_model=ProductVariantResponse,
)
def get_product_variant(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
):
    get_product_or_404(product_id, db)

    variant = db.scalar(
        variant_query().where(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        )
    )

    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found.",
        )

    return variant


@router.patch(
    "/{variant_id}",
    response_model=ProductVariantResponse,
)
def update_product_variant(
    product_id: int,
    variant_id: int,
    variant_data: ProductVariantUpdate,
    db: Session = Depends(get_db),
):
    get_product_or_404(product_id, db)

    variant = db.get(ProductVariant, variant_id)

    if not variant or variant.product_id != product_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found.",
        )

    update_data = variant_data.model_dump(exclude_unset=True)

    if "sku" in update_data:
        existing_variant = db.scalar(
            select(ProductVariant).where(
                ProductVariant.sku == update_data["sku"],
                ProductVariant.id != variant_id,
            )
        )

        if existing_variant:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A variant with this SKU already exists.",
            )

    for field, value in update_data.items():
        setattr(variant, field, value)

    db.commit()

    return db.scalar(
        variant_query().where(
            ProductVariant.id == variant_id
        )
    )


@router.delete(
    "/{variant_id}",
    response_model=ProductVariantResponse,
)
def deactivate_product_variant(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
):
    get_product_or_404(product_id, db)

    variant = db.get(ProductVariant, variant_id)

    if not variant or variant.product_id != product_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found.",
        )

    variant.is_active = False

    db.commit()

    return db.scalar(
        variant_query().where(
            ProductVariant.id == variant_id
        )
    )