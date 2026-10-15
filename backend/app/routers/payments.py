
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.order import Order
from app.models.payment import Payment
from app.models.user import User
from app.services.esewa import (
    build_esewa_payment_fields,
    verify_esewa_transaction,
)

router = APIRouter(prefix="/api/payments", tags=["Payments"])


def normalize_amount(value) -> Decimal:
    try:
        amount = Decimal(str(value)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError("Invalid payment amount.") from exc

    if not amount.is_finite() or amount < 0:
        raise ValueError("Invalid payment amount.")

    return amount


class EsewaInitiateRequest(BaseModel):
    order_id: int = Field(gt=0)


class EsewaVerifyRequest(BaseModel):
    transaction_uuid: str = Field(min_length=1, max_length=100)


@router.post("/esewa/initiate")
def initiate_esewa_payment(
    payload: EsewaInitiateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        order = db.scalar(
            select(Order)
            .where(
                Order.id == payload.order_id,
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

        if payment.payment_status == "PAID":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The payment record is already marked as paid.",
            )

        if not payment.transaction_uuid:
            payment.transaction_uuid = uuid4().hex

        fields = build_esewa_payment_fields(
            total_amount=order.total_amount,
            transaction_uuid=payment.transaction_uuid,
        )

        response_data = {
            "form_url": settings.esewa_payment_url,
            "form_fields": fields,
            "order_id": order.id,
            "order_number": order.order_number,
        }

        db.commit()
        return response_data

    except HTTPException:
        db.rollback()
        raise

    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to initiate eSewa payment.",
        ) from exc


@router.post("/esewa/verify")
async def verify_esewa_payment(
    payload: EsewaVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # 1. Read payment and order WITHOUT acquiring row locks.
        payment_reference = db.scalar(
            select(Payment).where(
                Payment.transaction_uuid == payload.transaction_uuid
            )
        )

        if payment_reference is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment transaction not found.",
            )

        order = db.scalar(
            select(Order).where(
                Order.id == payment_reference.order_id,
                Order.user_id == current_user.id,
            )
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

        if payment_reference.payment_method != "ESEWA":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment method mismatch.",
            )

        if order.payment_status == "PAID":
            if payment_reference.payment_status != "PAID":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Order and payment statuses are inconsistent.",
                )

            return {
                "message": "Payment already verified.",
                "order_id": order.id,
                "order_number": order.order_number,
                "payment_status": "PAID",
            }

        if payment_reference.payment_status == "PAID":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Order and payment statuses are inconsistent.",
            )

        if order.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This order is no longer awaiting payment.",
            )

        # Remember the amount used for the external verification.
        expected_amount = normalize_amount(order.total_amount)

        # 2. Contact eSewa BEFORE acquiring database row locks.
        # The HTTP client must have a finite timeout.
        result = await verify_esewa_transaction(
            transaction_uuid=payload.transaction_uuid,
            expected_amount=expected_amount,
        )

        if str(result.get("status", "")).upper() != "COMPLETE":
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

        try:
            actual_amount = normalize_amount(returned_amount)
        except (ValueError, TypeError, ArithmeticError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The payment amount could not be verified.",
            ) from exc

        if actual_amount != expected_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The verified transaction amount does not match.",
            )

        returned_product_code = (
            result.get("product_code") or result.get("scd")
        )

        if (
            returned_product_code is not None
            and str(returned_product_code) != settings.esewa_product_code
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The verified product code does not match.",
            )

        # 3. eSewa confirmed payment. Now acquire locks and recheck
        # everything before changing the database.
        locked_order = db.scalar(
            select(Order)
            .where(
                Order.id == payment_reference.order_id,
                Order.user_id == current_user.id,
            )
            .with_for_update()
        )

        if locked_order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found.",
            )

        locked_payment = db.scalar(
            select(Payment)
            .where(
                Payment.id == payment_reference.id,
                Payment.transaction_uuid == payload.transaction_uuid,
            )
            .with_for_update()
        )

        if locked_payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment transaction not found.",
            )

        # Another verification request may have completed while we
        # were waiting for eSewa. Handle that safely.
        if locked_order.payment_status == "PAID":
            if locked_payment.payment_status != "PAID":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Order and payment statuses are inconsistent.",
                )

            return {
                "message": "Payment already verified.",
                "order_id": locked_order.id,
                "order_number": locked_order.order_number,
                "payment_status": "PAID",
            }

        if locked_payment.payment_status == "PAID":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Order and payment statuses are inconsistent.",
            )

        if locked_order.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This order is no longer awaiting payment.",
            )

        if locked_order.payment_method != "ESEWA":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This order does not use eSewa.",
            )

        if normalize_amount(locked_order.total_amount) != actual_amount:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The order amount changed during verification.",
            )

        now = datetime.now(timezone.utc)

        locked_payment.payment_status = "PAID"
        locked_payment.paid_at = now
        locked_order.payment_status = "PAID"

        db.commit()

        return {
            "message": "Payment verified successfully.",
            "order_id": locked_order.id,
            "order_number": locked_order.order_number,
            "payment_status": "PAID",
        }

    except HTTPException:
        db.rollback()
        raise

    except httpx.TimeoutException as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=(
                "eSewa verification timed out. "
                "Payment status has not been confirmed. "
                "Check your order before retrying."
            ),
        ) from exc

    except httpx.HTTPError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to communicate with eSewa. Please try again later.",
        ) from exc

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify the eSewa payment.",
        ) from exc