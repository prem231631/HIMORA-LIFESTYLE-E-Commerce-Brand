
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import require_admin
from app.database.session import get_db
from app.models import (
    Category,
    Inventory,
    Product,
    ProductVariant,
    User,
)
from app.schemas import ProductCreate, ProductResponse, ProductUpdate


router = APIRouter(
    prefix="/api/products",
    tags=["Products"],
)


def product_query():
    return select(Product).options(
        selectinload(Product.category),
        selectinload(Product.images),
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
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if product_data.category_id is not None:
        category = db.get(Category, product_data.category_id)

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found.",
            )

    existing_product = db.scalar(
        select(Product).where(Product.slug == product_data.slug)
    )

    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A product with this slug already exists.",
        )

    product = Product(
        category_id=product_data.category_id,
        name=product_data.name,
        slug=product_data.slug,
        description=product_data.description,
        price=product_data.price,
        is_active=product_data.is_active,
        is_featured=product_data.is_featured,
        is_new=product_data.is_new,
        is_limited=product_data.is_limited,
    )

    try:
        db.add(product)
        db.flush()

        # One initial variant lets the existing inventory system
        # track stock even when the product has no size/color options.
        variant = ProductVariant(
            product_id=product.id,
            sku=f"HIM-{product.id}-DEFAULT",
            size=None,
            color=None,
            is_active=True,
        )

        db.add(variant)
        db.flush()

        inventory = Inventory(
            variant_id=variant.id,
            stock_quantity=product_data.stock_quantity,
            reserved_quantity=0,
            sold_quantity=0,
        )

        db.add(inventory)
        db.commit()

    except Exception:
        db.rollback()
        raise

    return db.scalar(
        product_query().where(Product.id == product.id)
    )


@router.get(
    "",
    response_model=list[ProductResponse],
)
def get_products(
    db: Session = Depends(get_db),
):
    statement = product_query().order_by(Product.created_at.desc())
    return db.scalars(statement).all()


@router.get(
    "/featured",
    response_model=list[ProductResponse],
)
def get_featured_products(
    db: Session = Depends(get_db),
):
    statement = (
        product_query()
        .where(
            Product.is_active.is_(True),
            Product.is_featured.is_(True),
        )
        .order_by(Product.created_at.desc())
    )

    return db.scalars(statement).all()


@router.get(
    "/{product_slug}",
    response_model=ProductResponse,
)
def get_product(
    product_slug: str,
    db: Session = Depends(get_db),
):
    product = db.scalar(
        product_query().where(Product.slug == product_slug)
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return product


@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = get_product_or_404(product_id, db)

    update_data = product_data.model_dump(exclude_unset=True)

    if "category_id" in update_data:
        category_id = update_data["category_id"]

        if category_id is not None and not db.get(Category, category_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found.",
            )

    if "slug" in update_data:
        existing_product = db.scalar(
            select(Product).where(
                Product.slug == update_data["slug"],
                Product.id != product_id,
            )
        )

        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A product with this slug already exists.",
            )

    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()

    return db.scalar(
        product_query().where(Product.id == product_id)
    )


@router.delete(
    "/{product_id}",
    response_model=ProductResponse,
)
def deactivate_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = get_product_or_404(product_id, db)
    product.is_active = False
    db.commit()

    return db.scalar(
        product_query().where(Product.id == product_id)
    )
