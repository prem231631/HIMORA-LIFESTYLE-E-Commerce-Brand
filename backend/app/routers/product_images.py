from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import Product, ProductImage
from app.schemas import (
    ProductImageCreate,
    ProductImageResponse,
    ProductImageUpdate,
)


router = APIRouter(
    prefix="/api/products/{product_id}/images",
    tags=["Product Images"],
)


def get_product_or_404(
    product_id: int,
    db: Session,
) -> Product:
    product = db.get(Product, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return product


@router.post(
    "",
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_product_image(
    product_id: int,
    image_data: ProductImageCreate,
    db: Session = Depends(get_db),
):
    get_product_or_404(product_id, db)

    if image_data.is_primary:
        existing_primary_images = db.scalars(
            select(ProductImage).where(
                ProductImage.product_id == product_id,
                ProductImage.is_primary.is_(True),
            )
        ).all()

        for image in existing_primary_images:
            image.is_primary = False

    image = ProductImage(
        product_id=product_id,
        image_url=image_data.image_url,
        alt_text=image_data.alt_text,
        is_primary=image_data.is_primary,
        sort_order=image_data.sort_order,
    )

    db.add(image)
    db.commit()
    db.refresh(image)

    return image


@router.get(
    "",
    response_model=list[ProductImageResponse],
)
def get_product_images(
    product_id: int,
    db: Session = Depends(get_db),
):
    get_product_or_404(product_id, db)

    statement = (
        select(ProductImage)
        .where(ProductImage.product_id == product_id)
        .order_by(
            ProductImage.sort_order.asc(),
            ProductImage.id.asc(),
        )
    )

    return db.scalars(statement).all()


@router.patch(
    "/{image_id}",
    response_model=ProductImageResponse,
)
def update_product_image(
    product_id: int,
    image_id: int,
    image_data: ProductImageUpdate,
    db: Session = Depends(get_db),
):
    get_product_or_404(product_id, db)

    image = db.scalar(
        select(ProductImage).where(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
        )
    )

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product image not found.",
        )

    update_data = image_data.model_dump(
        exclude_unset=True
    )

    if update_data.get("is_primary") is True:
        existing_primary_images = db.scalars(
            select(ProductImage).where(
                ProductImage.product_id == product_id,
                ProductImage.is_primary.is_(True),
                ProductImage.id != image_id,
            )
        ).all()

        for existing_image in existing_primary_images:
            existing_image.is_primary = False

    for field, value in update_data.items():
        setattr(image, field, value)

    db.commit()
    db.refresh(image)

    return image


@router.delete(
    "/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
):
    get_product_or_404(product_id, db)

    image = db.scalar(
        select(ProductImage).where(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
        )
    )

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product image not found.",
        )

    db.delete(image)
    db.commit()