
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.order import Order
from app.models.payment import Payment
from app.models.user import User
from app.services.esewa import build_esewa_payment_fields


router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/esewa/initiate")
def initiate_esewa_payment(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order_id = payload.get("order_id")

    if not isinstance(order_id, int) or isinstance(order_id, bool):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A valid order_id is required.",
        )

    order = db.scalar(
        select(Order)
        .where(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
        .with_for_update()
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    if order.payment_method != "ESEWA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order is not configured for eSewa payment.",
        )

    if order.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending orders can initiate payment.",
        )

    if order.payment_status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This order has already been paid.",
        )

    payment = db.scalar(
        select(Payment)
        .where(Payment.order_id == order.id)
        .with_for_update()
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The payment record for this order is missing.",
        )

    if payment.payment_method != "ESEWA":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The payment record does not match the order.",
        )

    try:
        # Reuse an existing reference for retry-safe initiation.
        # A later step will handle verified failures and retry policy.
        if not payment.transaction_uuid:
            payment.transaction_uuid = uuid4().hex

        fields = build_esewa_payment_fields(
            total_amount=order.total_amount,
            transaction_uuid=payment.transaction_uuid,
        )

        db.commit()

    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    except Exception:
        db.rollback()
        raise

    return {
        "form_url": settings.esewa_payment_url,
        "form_fields": fields,
        "order_id": order.id,
        "order_number": order.order_number,
    }
