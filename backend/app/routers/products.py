from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database.session import get_db
from app.models import Category, Product
from app.schemas import ProductCreate, ProductResponse, ProductUpdate


router = APIRouter(
    prefix="/api/products",
    tags=["Products"],
)


def product_query():
    return (
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.images),
        )
    )


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
):
    if product_data.category_id is not None:
        category = db.get(Category, product_data.category_id)

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found.",
            )

    existing_product = db.scalar(
        select(Product).where(
            Product.slug == product_data.slug
        )
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

    db.add(product)
    db.commit()
    db.refresh(product)

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
    statement = (
        product_query()
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


@router.get("/{product_slug}", response_model=ProductResponse)
def get_product(product_slug: str, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.images),
        )
        .filter(Product.slug == product_slug)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
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
):
    product = db.get(Product, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    update_data = product_data.model_dump(
        exclude_unset=True
    )

    if "category_id" in update_data:
        category_id = update_data["category_id"]

        if category_id is not None:
            category = db.get(Category, category_id)

            if not category:
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
):
    product = db.get(Product, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    product.is_active = False

    db.commit()

    return db.scalar(
        product_query().where(Product.id == product_id)
    )