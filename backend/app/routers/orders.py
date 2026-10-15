from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user, require_admin
from app.database.session import get_db
from app.models import (
    Address,
    Cart,
    CartItem,
    Inventory,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    User,
    ProductVariant,
)
from app.schemas import (
    AdminOrderResponse,
    CheckoutRequest,
    OrderCancelRequest,
    OrderResponse,
    OrderStatusUpdateRequest,
)


router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"],
)


ORDER_LOAD_OPTIONS = (
    selectinload(Order.items),
    selectinload(Order.status_history),
    selectinload(Order.payment),
)


def generate_order_number() -> str:
    return f"HIM-{uuid4().hex[:10].upper()}"


def load_order(db: Session, order_id: int) -> Order | None:
    return db.scalar(
        select(Order)
        .options(*ORDER_LOAD_OPTIONS)
        .where(Order.id == order_id)
    )


def build_admin_order_response(
    order: Order,
    customer: User,
) -> AdminOrderResponse:
    return AdminOrderResponse(
        id=order.id,
        order_number=order.order_number,
        status=order.status,
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        subtotal=order.subtotal,
        shipping_fee=order.shipping_fee,
        total_amount=order.total_amount,
        shipping_full_name=order.shipping_full_name,
        shipping_phone=order.shipping_phone,
        shipping_province=order.shipping_province,
        shipping_city=order.shipping_city,
        shipping_address_line=order.shipping_address_line,
        shipping_landmark=order.shipping_landmark,
        shipping_postal_code=order.shipping_postal_code,
        notes=order.notes,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=order.items,
        status_history=order.status_history,
        payment=order.payment,
        customer_id=customer.id,
        customer_name=customer.full_name,
        customer_email=customer.email,
        customer_phone=getattr(customer, "phone", None),
    )


# =========================================================
# CUSTOMER CHECKOUT
# =========================================================

@router.post(
    "/checkout",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def checkout(
    checkout_data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    address = db.scalar(
        select(Address).where(
            Address.id == checkout_data.address_id,
            Address.user_id == current_user.id,
            Address.is_active.is_(True),
        )
    )

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping address not found.",
        )

    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
        )
        .where(Cart.user_id == current_user.id)
    )

    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your cart is empty.",
        )

    try:
        inventory_records = []
        subtotal = Decimal("0.00")

        for cart_item in cart.items:
            inventory = db.scalar(
                select(Inventory)
                .where(
                    Inventory.variant_id == cart_item.variant_id
                )
                .with_for_update()
            )

            if not inventory:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Inventory is not configured for "
                        f"variant {cart_item.variant_id}."
                    ),
                )

            available_quantity = (
                inventory.stock_quantity
                - inventory.reserved_quantity
            )

            if cart_item.quantity > available_quantity:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Insufficient stock for variant "
                        f"{cart_item.variant_id}. "
                        f"Available quantity: "
                        f"{max(available_quantity, 0)}."
                    ),
                )

            variant = cart_item.variant
            product = variant.product

            if not product:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product for variant "
                        f"{cart_item.variant_id} was not found."
                    ),
                )

            if not variant.is_active or not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product '{product.name}' is no longer "
                        "available for purchase."
                    ),
                )

            item_subtotal = (
                Decimal(str(product.price))
                * cart_item.quantity
            )

            subtotal += item_subtotal
            inventory_records.append(
                (cart_item, variant, product, inventory)
            )

        shipping_fee = Decimal("0.00")
        total_amount = subtotal + shipping_fee

        order = Order(
            user_id=current_user.id,
            order_number=generate_order_number(),
            status="PENDING",
            payment_method="CASH_ON_DELIVERY",
            payment_status="PENDING",
            subtotal=subtotal,
            shipping_fee=shipping_fee,
            total_amount=total_amount,
            shipping_full_name=address.full_name,
            shipping_phone=address.phone,
            shipping_province=address.province,
            shipping_city=address.city,
            shipping_address_line=address.address_line,
            shipping_landmark=address.landmark,
            shipping_postal_code=address.postal_code,
            notes=checkout_data.notes,
        )

        db.add(order)
        db.flush()

        for cart_item, variant, product, inventory in inventory_records:
            item_subtotal = (
                Decimal(str(product.price))
                * cart_item.quantity
            )

            db.add(
                OrderItem(
                    order_id=order.id,
                    variant_id=variant.id,
                    product_name=product.name,
                    sku=variant.sku,
                    size=variant.size,
                    color=variant.color,
                    quantity=cart_item.quantity,
                    unit_price=product.price,
                    subtotal=item_subtotal,
                )
            )

            inventory.reserved_quantity += cart_item.quantity

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                status="PENDING",
                note="Order placed successfully.",
            )
        )

        db.add(
            Payment(
                order_id=order.id,
                payment_method="CASH_ON_DELIVERY",
                payment_status="PENDING",
                amount=total_amount,
            )
        )

        for cart_item in list(cart.items):
            db.delete(cart_item)

        db.commit()

        order = load_order(db, order.id)

        if not order:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Order was created but could not be reloaded.",
            )

        return order

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete checkout.",
        ) from exc


# =========================================================
# CUSTOMER — GET MY ORDERS
# =========================================================

@router.get(
    "",
    response_model=list[OrderResponse],
)
def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Order)
        .options(*ORDER_LOAD_OPTIONS)
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    ).all()


# =========================================================
# CUSTOMER — GET ORDER DETAIL
# =========================================================

@router.get(
    "/{order_id}",
    response_model=OrderResponse,
)
def get_my_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .options(*ORDER_LOAD_OPTIONS)
        .where(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    return order


# =========================================================
# CUSTOMER — CANCEL ORDER
# =========================================================

@router.post(
    "/{order_id}/cancel",
    response_model=OrderResponse,
)
def cancel_order(
    order_id: int,
    cancel_data: OrderCancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .options(*ORDER_LOAD_OPTIONS)
        .where(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
        .with_for_update()
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    if order.status not in {"PENDING", "CONFIRMED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Order cannot be cancelled while its status "
                f"is {order.status}."
            ),
        )

    try:
        for order_item in order.items:
            inventory = db.scalar(
                select(Inventory)
                .where(
                    Inventory.variant_id == order_item.variant_id
                )
                .with_for_update()
            )

            if inventory:
                inventory.reserved_quantity = max(
                    inventory.reserved_quantity - order_item.quantity,
                    0,
                )

        order.status = "CANCELLED"

        reason = (
            cancel_data.reason.strip()
            if cancel_data.reason
            else None
        )

        note = "Order cancelled by customer."

        if reason:
            note = f"{note} Reason: {reason}"

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                status="CANCELLED",
                note=note,
            )
        )

        if order.payment_method == "CASH_ON_DELIVERY":
            order.payment_status = "PENDING"

            if order.payment:
                order.payment.payment_status = "PENDING"
                order.payment.paid_at = None

        db.commit()

        updated_order = load_order(db, order.id)

        if not updated_order:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to reload the cancelled order.",
            )

        return updated_order

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to cancel the order.",
        ) from exc


# =========================================================
# ADMIN — GET ALL ORDERS
# =========================================================

@router.get(
    "/admin/all",
    response_model=list[AdminOrderResponse],
)
def get_all_orders(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    orders = db.scalars(
        select(Order)
        .options(*ORDER_LOAD_OPTIONS)
        .order_by(Order.created_at.desc())
    ).all()

    customer_ids = {order.user_id for order in orders}

    customers = {}

    if customer_ids:
        customer_list = db.scalars(
            select(User).where(User.id.in_(customer_ids))
        ).all()

        customers = {
            customer.id: customer
            for customer in customer_list
        }

    result = []

    for order in orders:
        customer = customers.get(order.user_id)

        if not customer:
            continue

        result.append(
            build_admin_order_response(order, customer)
        )

    return result


# =========================================================
# ADMIN — GET ORDER DETAIL
# =========================================================

@router.get(
    "/admin/{order_id}",
    response_model=AdminOrderResponse,
)
def get_admin_order(
    order_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    order = load_order(db, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    customer = db.get(User, order.user_id)

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    return build_admin_order_response(order, customer)


# =========================================================
# ADMIN — UPDATE ORDER STATUS
# =========================================================

@router.patch(
    "/admin/{order_id}/status",
    response_model=AdminOrderResponse,
)
def update_order_status(
    order_id: int,
    status_data: OrderStatusUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    new_status = status_data.status.strip().upper()

    allowed_statuses = {
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
    }

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid order status: {new_status}.",
        )

    order = db.scalar(
        select(Order)
        .options(*ORDER_LOAD_OPTIONS)
        .where(Order.id == order_id)
        .with_for_update()
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    if order.status in {"CANCELLED", "DELIVERED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"A {order.status.lower()} order cannot be updated."
            ),
        )

    valid_transitions = {
        "PENDING": {"CONFIRMED", "CANCELLED"},
        "CONFIRMED": {"PROCESSING", "CANCELLED"},
        "PROCESSING": {"SHIPPED"},
        "SHIPPED": {"OUT_FOR_DELIVERY"},
        "OUT_FOR_DELIVERY": {"DELIVERED"},
    }

    if new_status not in valid_transitions.get(order.status, set()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot change order status from {order.status} "
                f"to {new_status}."
            ),
        )

    try:
        if new_status == "CANCELLED":
            for order_item in order.items:
                inventory = db.scalar(
                    select(Inventory)
                    .where(
                        Inventory.variant_id == order_item.variant_id
                    )
                    .with_for_update()
                )

                if inventory:
                    inventory.reserved_quantity = max(
                        inventory.reserved_quantity - order_item.quantity,
                        0,
                    )

            if order.payment_method == "CASH_ON_DELIVERY":
                order.payment_status = "PENDING"

                if order.payment:
                    order.payment.payment_status = "PENDING"
                    order.payment.paid_at = None

        if new_status == "DELIVERED":
            for order_item in order.items:
                inventory = db.scalar(
                    select(Inventory)
                    .where(
                        Inventory.variant_id == order_item.variant_id
                    )
                    .with_for_update()
                )

                if not inventory:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            "Inventory is missing for variant "
                            f"{order_item.variant_id}."
                        ),
                    )

                quantity = order_item.quantity

                if inventory.reserved_quantity < quantity:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            "Reserved inventory is insufficient "
                            "to finalize this delivery."
                        ),
                    )

                if inventory.stock_quantity < quantity:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            "Inventory stock is insufficient "
                            "to finalize this delivery."
                        ),
                    )

                inventory.stock_quantity -= quantity
                inventory.reserved_quantity -= quantity
                inventory.sold_quantity += quantity

            order.payment_status = "PAID"

            if order.payment:
                order.payment.payment_status = "PAID"
                order.payment.paid_at = datetime.now(timezone.utc)

        order.status = new_status

        history_note = (
            status_data.note.strip()
            if status_data.note and status_data.note.strip()
            else f"Order status changed to {new_status} by admin."
        )

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                status=new_status,
                note=history_note,
            )
        )

        db.commit()

        updated_order = load_order(db, order.id)

        if not updated_order:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to reload the updated order.",
            )

        customer = db.get(User, updated_order.user_id)

        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found.",
            )

        return build_admin_order_response(updated_order, customer)

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update order status.",
        ) from exc



