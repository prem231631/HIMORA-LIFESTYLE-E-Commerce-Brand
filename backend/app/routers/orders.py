from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models import User


router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"],
)


@router.get("/test")
def test_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {
        "message": "Order router is working.",
        "user_id": current_user.id,
        "email": current_user.email,
    }