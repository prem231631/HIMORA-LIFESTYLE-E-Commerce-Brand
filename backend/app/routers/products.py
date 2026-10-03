from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database.session import get_db
from app.models import Product
from app.schemas import ProductResponse


router = APIRouter(
    prefix="/api/products",
    tags=["Products"],
)


@router.get("/featured", response_model=list[ProductResponse])
def get_featured_products(
    db: Session = Depends(get_db),
):
    statement = (
        select(Product)
        .where(
            Product.is_active.is_(True),
            Product.is_featured.is_(True),
        )
        .options(
            selectinload(Product.category),
            selectinload(Product.images),
        )
        .order_by(Product.created_at.desc())
    )

    products = db.scalars(statement).all()

    return products