from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.database.session import get_db
from app.models import Category, User
from app.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)


router = APIRouter(
    prefix="/api/categories",
    tags=["Categories"],
)


def normalize_category_data(data: dict) -> dict:
    """Normalize category names and slugs."""
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()

    if "slug" in data and data["slug"] is not None:
        data["slug"] = data["slug"].strip().lower()

    if "description" in data and data["description"] is not None:
        data["description"] = data["description"].strip() or None

    return data


def validate_category_values(name: str, slug: str) -> None:
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Category name cannot be empty.",
        )

    if not slug:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Category slug cannot be empty.",
        )


@router.get(
    "",
    response_model=list[CategoryResponse],
    summary="Get Categories",
)
def get_categories(
    db: Session = Depends(get_db),
):
    statement = (
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.name.asc())
    )

    return db.scalars(statement).all()


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Category",
)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    data = normalize_category_data(
        category_data.model_dump()
    )

    validate_category_values(
        data["name"],
        data["slug"],
    )

    existing_category = db.scalar(
        select(Category).where(
            (Category.name == data["name"])
            | (Category.slug == data["slug"])
        )
    )

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name or slug already exists.",
        )

    category = Category(
        name=data["name"],
        slug=data["slug"],
        description=data.get("description"),
    )

    try:
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name or slug already exists.",
        )


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Get Category",
)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    category = db.get(Category, category_id)

    if not category or not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    return category


@router.patch(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Update Category",
)
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    category = db.get(Category, category_id)

    if not category or not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active category not found.",
        )

    update_data = normalize_category_data(
        category_data.model_dump(exclude_unset=True)
    )

    if not update_data:
        return category

    if "name" in update_data:
        validate_category_values(
            update_data["name"],
            category.slug,
        )

    if "slug" in update_data:
        validate_category_values(
            category.name,
            update_data["slug"],
        )

    new_name = update_data.get("name", category.name)
    new_slug = update_data.get("slug", category.slug)

    existing_category = db.scalar(
        select(Category).where(
            Category.id != category_id,
            (
                (Category.name == new_name)
                | (Category.slug == new_slug)
            ),
        )
    )

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another category already uses this name or slug.",
        )

    for field, value in update_data.items():
        setattr(category, field, value)

    try:
        db.commit()
        db.refresh(category)
        return category

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name or slug already exists.",
        )


@router.delete(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Deactivate Category",
)
def deactivate_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    category = db.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    if not category.is_active:
        return category

    category.is_active = False

    try:
        db.commit()
        db.refresh(category)
        return category

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The category could not be deactivated.",
        )