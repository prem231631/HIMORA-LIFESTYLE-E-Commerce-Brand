from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import Category
from app.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)


router = APIRouter(
    prefix="/api/categories",
    tags=["Categories"],
)


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
):
    existing_category = db.scalar(
        select(Category).where(
            (Category.name == category_data.name)
            | (Category.slug == category_data.slug)
        )
    )

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name or slug already exists.",
        )

    category = Category(
        name=category_data.name,
        slug=category_data.slug,
        description=category_data.description,
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


@router.get(
    "",
    response_model=list[CategoryResponse],
)
def get_categories(
    db: Session = Depends(get_db),
):
    statement = (
        select(Category)
        .order_by(Category.name.asc())
    )

    return db.scalars(statement).all()


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    category = db.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    return category


@router.patch(
    "/{category_id}",
    response_model=CategoryResponse,
)
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
):
    category = db.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    update_data = category_data.model_dump(
        exclude_unset=True
    )

    if "name" in update_data or "slug" in update_data:
        name = update_data.get("name", category.name)
        slug = update_data.get("slug", category.slug)

        existing_category = db.scalar(
            select(Category).where(
                Category.id != category_id,
                (Category.name == name)
                | (Category.slug == slug),
            )
        )

        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another category already uses this name or slug.",
            )

    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return category


@router.delete(
    "/{category_id}",
    response_model=CategoryResponse,
)
def deactivate_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    category = db.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    category.is_active = False

    db.commit()
    db.refresh(category)

    return category