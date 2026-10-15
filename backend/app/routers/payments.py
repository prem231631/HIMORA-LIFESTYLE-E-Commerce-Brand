
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
from decimal import Decimal, ROUND_HALF_UP
from app.services.esewa import build_esewa_payment_fields, verify_esewa_transaction

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




from pydantic import BaseModel, Field


class EsewaVerifyRequest(BaseModel):
    transaction_uuid: str = Field(min_length=1, max_length=100)


@router.post("/esewa/verify")
async def verify_esewa_payment(
    payload: EsewaVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.scalar(
        select(Payment)
        .where(Payment.transaction_uuid == payload.transaction_uuid)
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment transaction not found.",
        )

    order = db.scalar(
        select(Order)
        .where(
            Order.id == payment.order_id,
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
            detail="This order does not use eSewa.",
        )

    if payment.payment_method != "ESEWA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment method mismatch.",
        )

    # Make duplicate verification requests safe.
    if order.payment_status == "PAID":
        return {
            "message": "Payment already verified.",
            "order_id": order.id,
            "order_number": order.order_number,
            "payment_status": order.payment_status,
        }

    if payment.transaction_uuid != payload.transaction_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction reference mismatch.",
        )

    try:
        result = await verify_esewa_transaction(
            transaction_uuid=payload.transaction_uuid,
            expected_amount=order.total_amount,
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify the payment with eSewa. Please try again.",
        ) from exc

    provider_status = str(result.get("status", "")).upper()

    if provider_status != "COMPLETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="eSewa has not confirmed this payment as complete.",
        )

    returned_uuid = result.get("transaction_uuid")
    if returned_uuid is None:
        returned_uuid = result.get("pid")

    if str(returned_uuid or "") != payload.transaction_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verified transaction reference does not match.",
        )

    returned_amount = result.get("total_amount")
    if returned_amount is None:
        returned_amount = result.get("totalAmount")

    if returned_amount is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="eSewa did not return a verifiable transaction amount.",
        )

    expected_amount = Decimal(str(order.total_amount)).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    actual_amount = Decimal(str(returned_amount)).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )

    if actual_amount != expected_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verified transaction amount does not match the order.",
        )

    returned_product_code = result.get("product_code") or result.get("scd")
    if (
        returned_product_code is not None
        and str(returned_product_code) != settings.esewa_product_code
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verified product code does not match.",
        )

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    payment.payment_status = "PAID"
    payment.paid_at = now
    order.payment_status = "PAID"

    db.commit()

    return {
        "message": "Payment verified successfully.",
        "order_id": order.id,
        "order_number": order.order_number,
        "payment_status": order.payment_status,
    }

