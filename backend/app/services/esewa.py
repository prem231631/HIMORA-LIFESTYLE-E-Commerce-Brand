
import base64
import hashlib
import hmac
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

import httpx

from app.core.config import settings


SIGNED_FIELD_NAMES = "total_amount,transaction_uuid,product_code"


def format_amount(value: Decimal | int | float | str) -> str:
    """Format an amount to two decimal places."""
    amount = Decimal(str(value)).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    return format(amount, ".2f")


def generate_esewa_signature(
    total_amount: str,
    transaction_uuid: str,
) -> str:
    """Generate the HMAC-SHA256 signature required by ePay v2."""
    secret = settings.esewa_secret_key

    if not secret:
        raise ValueError(
            "ESEWA_SECRET_KEY is not configured."
        )

    message = (
        f"total_amount={total_amount},"
        f"transaction_uuid={transaction_uuid},"
        f"product_code={settings.esewa_product_code}"
    )

    digest = hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    return base64.b64encode(digest).decode("utf-8")


def build_esewa_payment_fields(
    total_amount: Decimal | int | float | str,
    transaction_uuid: str,
    success_url: str | None = None,
    failure_url: str | None = None,
) -> dict[str, str]:
    """Build the form fields submitted to eSewa."""
    amount = format_amount(total_amount)

    if not transaction_uuid or not all(
        char.isalnum() or char == "-"
        for char in transaction_uuid
    ):
        raise ValueError("Invalid eSewa transaction UUID.")

    signature = generate_esewa_signature(
        total_amount=amount,
        transaction_uuid=transaction_uuid,
    )

    return {
        "amount": amount,
        "tax_amount": "0.00",
        "total_amount": amount,
        "transaction_uuid": transaction_uuid,
        "product_code": settings.esewa_product_code,
        "product_service_charge": "0.00",
        "product_delivery_charge": "0.00",
        "success_url": success_url or settings.esewa_success_url,
        "failure_url": failure_url or settings.esewa_failure_url,
        "signed_field_names": SIGNED_FIELD_NAMES,
        "signature": signature,
    }


async def verify_esewa_transaction(
    transaction_uuid: str,
    expected_amount: Decimal | int | float | str,
) -> dict[str, Any]:
    """
    Verify a transaction using eSewa's server-side status endpoint.

    A successful HTTP response alone does not mean payment is complete.
    The caller must validate the returned transaction details.
    """
    if not settings.esewa_status_url:
        raise ValueError(
            "ESEWA_STATUS_URL is not configured."
        )

    if not transaction_uuid:
        raise ValueError("Transaction UUID is required.")

    amount = format_amount(expected_amount)

    params = {
        "product_code": settings.esewa_product_code,
        "total_amount": amount,
        "transaction_uuid": transaction_uuid,
    }

    timeout = httpx.Timeout(
        connect=5.0,
        read=10.0,
        write=5.0,
        pool=5.0,
    )

    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=False,
    ) as client:
        response = await client.get(
            settings.esewa_status_url,
            params=params,
        )
        response.raise_for_status()
        result = response.json()

    if not isinstance(result, dict):
        raise ValueError("Unexpected response from eSewa.")

    returned_uuid = result.get("transaction_uuid")
    if returned_uuid is None:
        returned_uuid = result.get("pid")

    if str(returned_uuid or "") != transaction_uuid:
        raise ValueError(
            "eSewa transaction reference is missing or does not match."
        )

    returned_product_code = (
        result.get("product_code") or result.get("scd")
    )

    if (
        returned_product_code is not None
        and str(returned_product_code) != settings.esewa_product_code
    ):
        raise ValueError("eSewa product code does not match.")

    returned_amount = result.get("total_amount")
    if returned_amount is None:
        returned_amount = result.get("totalAmount")

    if returned_amount is None:
        raise ValueError("eSewa did not return a transaction amount.")

    try:
        actual_amount = Decimal(str(returned_amount)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
        expected = Decimal(amount)
    except (ValueError, TypeError, ArithmeticError) as exc:
        raise ValueError(
            "eSewa returned an invalid transaction amount."
        ) from exc

    if not actual_amount.is_finite() or actual_amount != expected:
        raise ValueError("eSewa transaction amount does not match.")

    return result
