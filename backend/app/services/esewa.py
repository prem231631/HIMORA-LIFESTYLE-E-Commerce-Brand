
import base64
import hashlib
import hmac
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

import httpx

from app.core.config import settings


SIGNED_FIELD_NAMES = "total_amount,transaction_uuid,product_code"


def format_amount(value: Decimal | int | float | str) -> str:
    """Format an amount to two decimal places without float arithmetic."""
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
            "ESEWA_SECRET_KEY is not configured in the backend environment."
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
    """Build the form fields submitted to the eSewa payment page."""
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
    Query eSewa's server-side status endpoint.

    The caller must update the order to PAID only when the returned
    status is COMPLETE and all transaction details match.
    """
    amount = format_amount(expected_amount)

    params = {
        "product_code": settings.esewa_product_code,
        "total_amount": amount,
        "transaction_uuid": transaction_uuid,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
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
        # Some legacy response formats use a different identifier.
        returned_uuid = result.get("pid")

    returned_product_code = (
        result.get("product_code") or result.get("scd")
    )

    returned_amount = (
        result.get("total_amount")
        if result.get("total_amount") is not None
        else result.get("totalAmount")
    )

    if returned_uuid is not None and str(returned_uuid) != transaction_uuid:
        raise ValueError("eSewa transaction reference does not match.")

    if (
        returned_product_code is not None
        and str(returned_product_code) != settings.esewa_product_code
    ):
        raise ValueError("eSewa product code does not match.")

    if returned_amount is not None:
        if Decimal(str(returned_amount)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        ) != Decimal(amount):
            raise ValueError("eSewa transaction amount does not match.")
    elif str(result.get("status", "")).upper() == "COMPLETE":
        raise ValueError("eSewa did not return a verifiable amount.")

    return result
