
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.security import require_admin
from app.database.session import get_db
from app.models import Category, Inventory, Product, ProductVariant, User
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
    return select(ProductVariant).options(
        selectinload(ProductVariant.inventory),
    )


def get_product_or_404(
    product_id: int,
    db: Session,
) -> Product:
    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return product


def get_variant_or_404(
    product_id: int,
    variant_id: int,
    db: Session,
) -> ProductVariant:
    variant = db.scalar(
        variant_query().where(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        )
    )

    if variant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found.",
        )

    return variant


@router.post(
    "",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product_variant(
    product_id: int,
    variant_data: ProductVariantCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = get_product_or_404(product_id, db)

    if not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add variants to an inactive product.",
        )

    sku = variant_data.sku.strip()

    if not sku:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="SKU cannot be empty.",
        )

    existing_variant = db.scalar(
        select(ProductVariant).where(
            ProductVariant.sku == sku,
        )
    )

    if existing_variant:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A variant with this SKU already exists.",
        )

    variant = ProductVariant(
        product_id=product_id,
        sku=sku,
        size=variant_data.size.strip() if variant_data.size else None,
        color=variant_data.color.strip() if variant_data.color else None,
        is_active=variant_data.is_active,
    )

    try:
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

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The variant could not be created because its SKU already exists or a conflicting value was provided.",
        )

    return get_variant_or_404(product_id, variant.id, db)


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
        .where(
            ProductVariant.product_id == product_id,
            ProductVariant.is_active.is_(True),
        )
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

    variant = get_variant_or_404(product_id, variant_id, db)

    if not variant.is_active:
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
    admin: User = Depends(require_admin),
):
    get_product_or_404(product_id, db)

    variant = get_variant_or_404(product_id, variant_id, db)
    update_data = variant_data.model_dump(exclude_unset=True)

    if "sku" in update_data and update_data["sku"] is not None:
        sku = update_data["sku"].strip()

        if not sku:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="SKU cannot be empty.",
            )

        existing_variant = db.scalar(
            select(ProductVariant).where(
                ProductVariant.sku == sku,
                ProductVariant.id != variant_id,
            )
        )

        if existing_variant:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A variant with this SKU already exists.",
            )

        update_data["sku"] = sku

    for field in ("size", "color"):
        if field in update_data and update_data[field] is not None:
            update_data[field] = update_data[field].strip() or None

    for field, value in update_data.items():
        setattr(variant, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The variant could not be updated because of a conflicting value.",
        )

    return get_variant_or_404(product_id, variant_id, db)


@router.delete(
    "/{variant_id}",
    response_model=ProductVariantResponse,
)
def deactivate_product_variant(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    get_product_or_404(product_id, db)

    variant = get_variant_or_404(product_id, variant_id, db)

    variant.is_active = False

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The variant could not be deactivated.",
        )

    return get_variant_or_404(product_id, variant_id, db)
