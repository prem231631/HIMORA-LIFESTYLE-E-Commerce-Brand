from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models import Cart, CartItem, Inventory, ProductVariant, User
from app.schemas import CartItemAdd, CartItemUpdate, CartResponse


router = APIRouter(
    prefix="/api/cart",
    tags=["Cart"],
)


def build_cart_response(
    cart: Cart,
) -> CartResponse:
    items = []
    total_items = 0
    subtotal = Decimal("0.00")

    for item in cart.items:
        variant = item.variant
        product = variant.product
        inventory = variant.inventory

        available_quantity = (
            inventory.available_quantity
            if inventory
            else 0
        )

        item_subtotal = product.price * item.quantity

        items.append(
            {
                "id": item.id,
                "variant_id": variant.id,
                "quantity": item.quantity,
                "sku": variant.sku,
                "product_id": product.id,
                "product_name": product.name,
                "unit_price": product.price,
                "size": variant.size,
                "color": variant.color,
                "available_quantity": available_quantity,
            }
        )

        total_items += item.quantity
        subtotal += item_subtotal

    return CartResponse(
        id=cart.id,
        user_id=cart.user_id,
        items=items,
        total_items=total_items,
        subtotal=subtotal,
    )


@router.get(
    "",
    response_model=CartResponse,
)
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart = db.scalar(
        select(Cart)
        .where(Cart.user_id == current_user.id)
    )

    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    return build_cart_response(cart)


@router.post(
    "/items",
    response_model=CartResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_cart_item(
    item_data: CartItemAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart = db.scalar(
        select(Cart)
        .where(Cart.user_id == current_user.id)
    )

    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.flush()

    variant = db.scalar(
        select(ProductVariant)
        .where(
            ProductVariant.id == item_data.variant_id,
            ProductVariant.is_active.is_(True),
        )
    )

    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found.",
        )

    inventory = db.scalar(
        select(Inventory)
        .where(Inventory.variant_id == variant.id)
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Inventory is not configured for this product variant.",
        )

    existing_item = db.scalar(
        select(CartItem)
        .where(
            CartItem.cart_id == cart.id,
            CartItem.variant_id == variant.id,
        )
    )

    new_quantity = item_data.quantity

    if existing_item:
        new_quantity += existing_item.quantity

    if new_quantity > inventory.available_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Only {inventory.available_quantity} units "
                "are currently available."
            ),
        )

    if existing_item:
        existing_item.quantity = new_quantity
    else:
        cart_item = CartItem(
            cart_id=cart.id,
            variant_id=variant.id,
            quantity=item_data.quantity,
        )
        db.add(cart_item)

    db.commit()
    db.refresh(cart)

    return build_cart_response(cart)


@router.patch(
    "/items/{item_id}",
    response_model=CartResponse,
)
def update_cart_item(
    item_id: int,
    item_data: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart = db.scalar(
        select(Cart)
        .where(Cart.user_id == current_user.id)
    )

    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found.",
        )

    cart_item = db.scalar(
        select(CartItem)
        .where(
            CartItem.id == item_id,
            CartItem.cart_id == cart.id,
        )
    )

    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found.",
        )

    inventory = db.scalar(
        select(Inventory)
        .where(
            Inventory.variant_id == cart_item.variant_id
        )
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Inventory is not configured.",
        )

    if item_data.quantity > inventory.available_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Only {inventory.available_quantity} units "
                "are currently available."
            ),
        )

    cart_item.quantity = item_data.quantity

    db.commit()
    db.refresh(cart)

    return build_cart_response(cart)


@router.delete(
    "/items/{item_id}",
    response_model=CartResponse,
)
def remove_cart_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart = db.scalar(
        select(Cart)
        .where(Cart.user_id == current_user.id)
    )

    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found.",
        )

    cart_item = db.scalar(
        select(CartItem)
        .where(
            CartItem.id == item_id,
            CartItem.cart_id == cart.id,
        )
    )

    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found.",
        )

    db.delete(cart_item)
    db.commit()
    db.refresh(cart)

    return build_cart_response(cart)