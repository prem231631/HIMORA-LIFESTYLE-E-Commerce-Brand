from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.schemas import CheckoutRequest, OrderCancelRequest, OrderResponse
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
)
from app.schemas import CheckoutRequest, OrderResponse


router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"],
)


def generate_order_number() -> str:
    return f"HIM-{uuid4().hex[:10].upper()}"


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
    # ---------------------------------------------------------
    # 1. Get and validate the shipping address
    # ---------------------------------------------------------
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

    # ---------------------------------------------------------
    # 2. Get the user's cart
    # ---------------------------------------------------------
    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
        )
        .where(Cart.user_id == current_user.id)
    )

    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your cart is empty.",
        )

    try:
        # -----------------------------------------------------
        # 3. Lock inventory rows and validate stock
        # -----------------------------------------------------
        inventory_records = []

        for cart_item in cart.items:
            inventory = db.scalar(
                select(Inventory)
                .where(
                    Inventory.variant_id == cart_item.variant_id,
                )
                .with_for_update()
            )

            if not inventory:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Inventory is not configured for "
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
                        f"Insufficient stock for "
                        f"variant {cart_item.variant_id}. "
                        f"Only {max(available_quantity, 0)} units "
                        f"are currently available."
                    ),
                )

            inventory_records.append(
                (cart_item, inventory)
            )

        # -----------------------------------------------------
        # 4. Calculate subtotal from database prices
        # -----------------------------------------------------
        subtotal = Decimal("0.00")

        for cart_item, _inventory in inventory_records:
            product = cart_item.variant.product

            item_subtotal = (
                product.price * cart_item.quantity
            )

            subtotal += item_subtotal

        shipping_fee = Decimal("0.00")
        total_amount = subtotal + shipping_fee

        # -----------------------------------------------------
        # 5. Create the order
        # -----------------------------------------------------
        order = Order(
            user_id=current_user.id,
            order_number=generate_order_number(),
            status="PENDING",
            payment_method="CASH_ON_DELIVERY",
            payment_status="PENDING",
            subtotal=subtotal,
            shipping_fee=shipping_fee,
            total_amount=total_amount,

            # Address snapshot
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

        # -----------------------------------------------------
        # 6. Create order items + reserve inventory
        # -----------------------------------------------------
        for cart_item, inventory in inventory_records:
            variant = cart_item.variant
            product = variant.product

            item_subtotal = (
                product.price * cart_item.quantity
            )

            order_item = OrderItem(
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

            db.add(order_item)

            # Reserve stock
            inventory.reserved_quantity += cart_item.quantity

        # -----------------------------------------------------
        # 7. Create initial order status history
        # -----------------------------------------------------
        status_history = OrderStatusHistory(
            order_id=order.id,
            status="PENDING",
            note="Order placed successfully.",
        )

        db.add(status_history)

        # -----------------------------------------------------
        # 8. Create COD payment record
        # -----------------------------------------------------
        payment = Payment(
            order_id=order.id,
            payment_method="CASH_ON_DELIVERY",
            payment_status="PENDING",
            amount=total_amount,
        )

        db.add(payment)

        # -----------------------------------------------------
        # 9. Clear cart
        # -----------------------------------------------------
        for cart_item in list(cart.items):
            db.delete(cart_item)

        # -----------------------------------------------------
        # 10. Commit everything atomically
        # -----------------------------------------------------
        db.commit()

        # -----------------------------------------------------
        # 11. Reload complete order relationships
        # -----------------------------------------------------
        order = db.scalar(
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.status_history),
                selectinload(Order.payment),
            )
            .where(Order.id == order.id)
        )

        return order

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete checkout.",
        )


@router.get(
    "",
    response_model=list[OrderResponse],
)
def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = db.scalars(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.payment),
        )
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    ).all()

    return orders


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
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.payment),
        )
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
    # ---------------------------------------------------------
    # 1. Find the customer's order
    # ---------------------------------------------------------
    order = db.scalar(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.payment),
        )
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

    # ---------------------------------------------------------
    # 2. Check whether cancellation is allowed
    # ---------------------------------------------------------
    cancellable_statuses = {
        "PENDING",
        "CONFIRMED",
    }

    if order.status not in cancellable_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Order cannot be cancelled while its status "
                f"is {order.status}."
            ),
        )

    try:
        # -----------------------------------------------------
        # 3. Release reserved inventory
        # -----------------------------------------------------
        for order_item in order.items:
            inventory = db.scalar(
                select(Inventory)
                .where(
                    Inventory.variant_id == order_item.variant_id,
                )
                .with_for_update()
            )

            if inventory:
                inventory.reserved_quantity = max(
                    inventory.reserved_quantity - order_item.quantity,
                    0,
                )

        # -----------------------------------------------------
        # 4. Update order status
        # -----------------------------------------------------
        order.status = "CANCELLED"

        # -----------------------------------------------------
        # 5. Add status history
        # -----------------------------------------------------
        reason = cancel_data.reason.strip() if cancel_data.reason else None

        history_note = "Order cancelled by customer."

        if reason:
            history_note += f" Reason: {reason}"

        status_history = OrderStatusHistory(
            order_id=order.id,
            status="CANCELLED",
            note=history_note,
        )

        db.add(status_history)

        # -----------------------------------------------------
        # 6. COD payment remains pending
        # -----------------------------------------------------
        if order.payment:
            order.payment.payment_status = "CANCELLED"

        order.payment_status = "CANCELLED"

        # -----------------------------------------------------
        # 7. Commit cancellation
        # -----------------------------------------------------
        db.commit()

        # -----------------------------------------------------
        # 8. Reload complete order
        # -----------------------------------------------------
        order = db.scalar(
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.status_history),
                selectinload(Order.payment),
            )
            .where(Order.id == order.id)
        )

        return order

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to cancel the order.",
        )


@router.get(
    "/admin/all",
    response_model=list[OrderResponse],
)
def get_all_orders(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    orders = db.scalars(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.payment),
        )
        .order_by(Order.created_at.desc())
    ).all()

    return orders