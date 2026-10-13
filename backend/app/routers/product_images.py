
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.database.session import get_db
from app.models import Product, ProductImage, User
from app.schemas import (
    ProductImageCreate,
    ProductImageResponse,
    ProductImageUpdate,
)


router = APIRouter(
    prefix="/api/products/{product_id}/images",
    tags=["Product Images"],
)

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "products"
MAX_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


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
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_product_image(
    product_id: int,
    image_data: ProductImageCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    get_product_or_404(product_id, db)

    if image_data.is_primary:
        existing = db.scalars(
            select(ProductImage).where(
                ProductImage.product_id == product_id,
                ProductImage.is_primary.is_(True),
            )
        ).all()

        for item in existing:
            item.is_primary = False

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


@router.post(
    "/upload",
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    alt_text: str | None = Form(default=None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    get_product_or_404(product_id, db)

    extension = ALLOWED_TYPES.get(file.content_type or "")
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, and WebP images are allowed.",
        )

    content = await file.read(MAX_FILE_SIZE + 1)
    await file.close()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size must not exceed 5 MB.",
        )

    # Verify basic file signatures rather than trusting MIME type alone.
    valid_signature = (
        (extension == ".jpg" and content.startswith(b"\xff\xd8\xff"))
        or (
            extension == ".png"
            and content.startswith(b"\x89PNG\r\n\x1a\n")
        )
        or (
            extension == ".webp"
            and content.startswith(b"RIFF")
            and content[8:12] == b"WEBP"
        )
    )

    if not valid_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The file contents do not match a supported image type.",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename

    existing_primary = db.scalar(
        select(ProductImage.id).where(
            ProductImage.product_id == product_id,
            ProductImage.is_primary.is_(True),
        )
    )

    try:
        destination.write_bytes(content)

        image = ProductImage(
            product_id=product_id,
            image_url=f"/uploads/products/{filename}",
            alt_text=alt_text,
            is_primary=existing_primary is None,
            sort_order=0,
        )

        db.add(image)
        db.commit()
        db.refresh(image)
        return image

    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise


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
        .order_by(ProductImage.sort_order, ProductImage.id)
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
    admin: User = Depends(require_admin),
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

    update_data = image_data.model_dump(exclude_unset=True)

    if update_data.get("is_primary") is True:
        existing = db.scalars(
            select(ProductImage).where(
                ProductImage.product_id == product_id,
                ProductImage.is_primary.is_(True),
                ProductImage.id != image_id,
            )
        ).all()

        for item in existing:
            item.is_primary = False

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
    admin: User = Depends(require_admin),
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

    # Only remove files stored in this application's upload directory.
    image_url = image.image_url
    db.delete(image)
    db.commit()

    if image_url.startswith("/uploads/products/"):
        filename = image_url.rsplit("/", 1)[-1]
        if filename and Path(filename).name == filename:
            (UPLOAD_DIR / filename).unlink(missing_ok=True)
