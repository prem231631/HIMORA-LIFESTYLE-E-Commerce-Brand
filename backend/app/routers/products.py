
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.security import require_admin
from app.database.session import get_db
from app.models import Category, Product, User
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


def normalize_name(value: str) -> str:
    return " ".join(value.strip().split())


def normalize_slug(value: str) -> str:
    return "-".join(value.strip().lower().split())


def get_product_or_404(db: Session, product_id: int) -> Product:
    product = db.scalar(
        product_query().where(Product.id == product_id)
    )

    if product is None:
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
    category_id = product_data.category_id

    if category_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A category is required for every product.",
        )

    category = db.get(Category, category_id)

    if category is None or not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active category not found.",
        )

    name = normalize_name(product_data.name)
    slug = normalize_slug(product_data.slug)

    if not name or not slug:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Product name and slug cannot be empty.",
        )

    existing_product = db.scalar(
        select(Product).where(Product.slug == slug)
    )

    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A product with this slug already exists.",
        )

    product = Product(
        category_id=category_id,
        name=name,
        slug=slug,
        description=(
            product_data.description.strip()
            if product_data.description
            else None
        ),
        price=product_data.price,
        is_active=product_data.is_active,
        is_featured=product_data.is_featured,
        is_new=product_data.is_new,
        is_limited=product_data.is_limited,
    )

    try:
        db.add(product)
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The product could not be created because of a conflicting value.",
        )

    return get_product_or_404(db, product.id)


@router.get(
    "",
    response_model=list[ProductResponse],
)
def get_products(
    db: Session = Depends(get_db),
):
    statement = (
        product_query()
        .where(Product.is_active.is_(True))
        .order_by(Product.created_at.desc())
    )

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
        product_query().where(
            Product.slug == product_slug,
            Product.is_active.is_(True),
        )
    )

    if product is None:
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
    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    update_data = product_data.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] is not None:
        update_data["name"] = normalize_name(update_data["name"])

        if not update_data["name"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Product name cannot be empty.",
            )

    if "slug" in update_data and update_data["slug"] is not None:
        update_data["slug"] = normalize_slug(update_data["slug"])

        if not update_data["slug"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Product slug cannot be empty.",
            )

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

    if "description" in update_data and update_data["description"] is not None:
        update_data["description"] = update_data["description"].strip() or None

    if "category_id" in update_data:
        category_id = update_data["category_id"]

        if category_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A product must belong to a category.",
            )

        category = db.get(Category, category_id)

        if category is None or not category.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Active category not found.",
            )

    for field, value in update_data.items():
        setattr(product, field, value)

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The product could not be updated because of a conflicting value.",
        )

    return get_product_or_404(db, product_id)


@router.delete(
    "/{product_id}",
    response_model=ProductResponse,
)
def deactivate_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = get_product_or_404(db, product_id)

    product.is_active = False

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The product could not be deactivated.",
        )

    return get_product_or_404(db, product_id)
