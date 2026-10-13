from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import require_admin
from app.database.session import get_db
from app.models import (
    Category,
    Inventory,
    Order,
    OrderStatusHistory,
    Payment,
    Product,
    ProductImage,
    ProductVariant,
    User,
)
from app.schemas import (
    AdminOrderResponse,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    OrderStatusUpdateRequest,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Management"],
)


# =========================================================
# REQUEST SCHEMAS
# =========================================================

class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    role: str | None = Field(default=None, pattern="^(user|admin)$")
    is_active: bool | None = None

    model_config = ConfigDict(extra="forbid")


class AdminVariantCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=100)
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=100)
    is_active: bool = True
    stock_quantity: int = Field(default=0, ge=0)

    model_config = ConfigDict(extra="forbid")


class AdminVariantUpdate(BaseModel):
    sku: str | None = Field(default=None, min_length=2, max_length=100)
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None

    model_config = ConfigDict(extra="forbid")


class AdminInventoryUpdate(BaseModel):
    stock_quantity: int | None = Field(default=None, ge=0)
    reserved_quantity: int | None = Field(default=None, ge=0)
    sold_quantity: int | None = Field(default=None, ge=0)

    model_config = ConfigDict(extra="forbid")


# =========================================================
# HELPERS
# =========================================================

def commit_or_rollback(db: Session):
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


def get_or_404(db: Session, model, record_id: int, name: str):
    instance = db.get(model, record_id)

    if instance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{name} not found.",
        )

    return instance


def serialize_model(instance):
    if instance is None:
        return None

    result = {}

    for column in instance.__table__.columns:
        value = getattr(instance, column.key)

        if isinstance(value, Decimal):
            value = float(value)
        elif isinstance(value, datetime):
            value = value.isoformat()

        result[column.key] = value

    return result


def serialize_inventory(inventory: Inventory | None):
    if inventory is None:
        return None

    result = serialize_model(inventory)
    result["available_quantity"] = inventory.available_quantity

    return result


def serialize_variant(variant: ProductVariant):
    result = serialize_model(variant)
    result["inventory"] = serialize_inventory(variant.inventory)
    return result


def serialize_product(product: Product):
    result = serialize_model(product)

    result["category"] = (
        serialize_model(product.category)
        if product.category
        else None
    )

    result["images"] = [
        serialize_model(image)
        for image in product.images
    ]

    result["variants"] = [
        serialize_variant(variant)
        for variant in product.variants
    ]

    return result


def load_order_query():
    return select(Order).options(
        selectinload(Order.items),
        selectinload(Order.status_history),
        selectinload(Order.payment),
    )


def serialize_admin_order(order: Order):
    result = {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "subtotal": order.subtotal,
        "shipping_fee": order.shipping_fee,
        "total_amount": order.total_amount,
        "shipping_full_name": order.shipping_full_name,
        "shipping_phone": order.shipping_phone,
        "shipping_province": order.shipping_province,
        "shipping_city": order.shipping_city,
        "shipping_address_line": order.shipping_address_line,
        "shipping_landmark": order.shipping_landmark,
        "shipping_postal_code": order.shipping_postal_code,
        "notes": order.notes,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": order.items,
        "status_history": order.status_history,
        "payment": order.payment,
        "customer_id": order.user_id,
        "customer_name": order.user.full_name if order.user else None,
        "customer_email": order.user.email if order.user else None,
        "customer_phone": order.user.phone if order.user else None,
    }

    return result


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@router.get("/dashboard")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    total_users = db.scalar(
        select(func.count(User.id))
    ) or 0

    active_users = db.scalar(
        select(func.count(User.id)).where(
            User.is_active.is_(True)
        )
    ) or 0

    total_products = db.scalar(
        select(func.count(Product.id))
    ) or 0

    active_products = db.scalar(
        select(func.count(Product.id)).where(
            Product.is_active.is_(True)
        )
    ) or 0

    total_categories = db.scalar(
        select(func.count(Category.id))
    ) or 0

    total_orders = db.scalar(
        select(func.count(Order.id))
    ) or 0

    pending_orders = db.scalar(
        select(func.count(Order.id)).where(
            Order.status == "PENDING"
        )
    ) or 0

    delivered_orders = db.scalar(
        select(func.count(Order.id)).where(
            Order.status == "DELIVERED"
        )
    ) or 0

    cancelled_orders = db.scalar(
        select(func.count(Order.id)).where(
            Order.status == "CANCELLED"
        )
    ) or 0

    total_revenue = db.scalar(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.status == "DELIVERED"
        )
    ) or Decimal("0.00")

    total_inventory_records = db.scalar(
        select(func.count(Inventory.id))
    ) or 0

    low_stock_records = db.scalar(
        select(func.count(Inventory.id)).where(
            Inventory.stock_quantity
            - Inventory.reserved_quantity <= 5
        )
    ) or 0

    recent_orders = db.scalars(
        load_order_query()
        .order_by(Order.created_at.desc())
        .limit(5)
    ).all()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_products": total_products,
        "active_products": active_products,
        "total_categories": total_categories,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "delivered_orders": delivered_orders,
        "cancelled_orders": cancelled_orders,
        "total_revenue": float(total_revenue),
        "total_inventory_records": total_inventory_records,
        "low_stock_records": low_stock_records,
        "recent_orders": [
            serialize_admin_order(order)
            for order in recent_orders
        ],
    }


# =========================================================
# ADMIN USERS
# =========================================================

@router.get("/users")
def admin_list_users(
    search: str | None = Query(default=None, max_length=200),
    role: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = select(User)

    if search:
        query = query.where(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.phone.ilike(f"%{search}%"),
            )
        )

    if role:
        if role not in {"user", "admin"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role.",
            )

        query = query.where(User.role == role)

    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))

    total = db.scalar(
        select(func.count()).select_from(
            query.order_by(None).subquery()
        )
    ) or 0

    users = db.scalars(
        query.order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return {
        "items": [
            {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at,
            }
            for user in users
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/users/{user_id}")
def admin_get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = get_or_404(db, User, user_id, "User")

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "addresses": [
            serialize_model(address)
            for address in user.addresses
        ],
    }


@router.patch("/users/{user_id}")
def admin_update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = get_or_404(db, User, user_id, "User")

    updates = payload.model_dump(exclude_unset=True)

    if user.id == admin.id:
        if updates.get("role", user.role) != "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot remove your own admin role.",
            )

        if updates.get("is_active", user.is_active) is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own account.",
            )

    if "phone" in updates and updates["phone"]:
        existing_user = db.scalar(
            select(User).where(
                User.phone == updates["phone"],
                User.id != user_id,
            )
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number is already in use.",
            )

    for field, value in updates.items():
        setattr(user, field, value)

    commit_or_rollback(db)
    db.refresh(user)

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }


# =========================================================
# ADMIN CATEGORIES
# =========================================================

@router.get("/categories")
def admin_list_categories(
    search: str | None = Query(default=None, max_length=200),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = select(Category)

    if search:
        query = query.where(
            or_(
                Category.name.ilike(f"%{search}%"),
                Category.slug.ilike(f"%{search}%"),
            )
        )

    total = db.scalar(
        select(func.count()).select_from(
            query.order_by(None).subquery()
        )
    ) or 0

    categories = db.scalars(
        query.order_by(Category.id.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return {
        "items": [
            serialize_model(category)
            for category in categories
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    category_data = payload.model_dump(exclude_unset=True)

    existing = db.scalar(
        select(Category).where(
            or_(
                Category.name == category_data["name"],
                Category.slug == category_data["slug"],
            )
        )
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category name or slug already exists.",
        )

    category = Category(**category_data)
    db.add(category)
    commit_or_rollback(db)
    db.refresh(category)

    return category


@router.get("/categories/{category_id}")
def admin_get_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    category = get_or_404(
        db,
        Category,
        category_id,
        "Category",
    )

    result = serialize_model(category)
    result["product_count"] = len(category.products)

    return result


@router.patch(
    "/categories/{category_id}",
    response_model=CategoryResponse,
)
def admin_update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    category = get_or_404(
        db,
        Category,
        category_id,
        "Category",
    )

    updates = payload.model_dump(exclude_unset=True)

    for field in ("name", "slug"):
        if field in updates and updates[field] is not None:
            existing = db.scalar(
                select(Category).where(
                    getattr(Category, field) == updates[field],
                    Category.id != category_id,
                )
            )

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Category {field} already exists.",
                )

    for field, value in updates.items():
        setattr(category, field, value)

    commit_or_rollback(db)
    db.refresh(category)

    return category


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def admin_delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    category = get_or_404(
        db,
        Category,
        category_id,
        "Category",
    )

    if category.products:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Move or remove the category's products before deleting it.",
        )

    db.delete(category)
    commit_or_rollback(db)


# =========================================================
# ADMIN PRODUCTS
# =========================================================

@router.get("/products")
def admin_list_products(
    search: str | None = Query(default=None, max_length=200),
    category_id: int | None = Query(default=None, ge=1),
    is_active: bool | None = Query(default=None),
    is_featured: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.images),
        selectinload(Product.variants).selectinload(
            ProductVariant.inventory
        ),
    )

    if search:
        query = query.where(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.slug.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%"),
            )
        )

    if category_id is not None:
        query = query.where(
            Product.category_id == category_id
        )

    if is_active is not None:
        query = query.where(
            Product.is_active.is_(is_active)
        )

    if is_featured is not None:
        query = query.where(
            Product.is_featured.is_(is_featured)
        )

    total = db.scalar(
        select(func.count()).select_from(
            query.order_by(None).subquery()
        )
    ) or 0

    products = db.scalars(
        query.order_by(Product.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return {
        "items": [
            serialize_product(product)
            for product in products
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    data = payload.model_dump(exclude={"stock_quantity"})

    existing = db.scalar(
        select(Product).where(
            Product.slug == data["slug"]
        )
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product slug already exists.",
        )

    if data.get("category_id") is not None:
        get_or_404(
            db,
            Category,
            data["category_id"],
            "Category",
        )

    product = Product(**data)
    db.add(product)
    commit_or_rollback(db)
    db.refresh(product)

    return product


@router.get("/products/{product_id}")
def admin_get_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = db.scalar(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.variants).selectinload(
                ProductVariant.inventory
            ),
        )
        .where(Product.id == product_id)
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return serialize_product(product)


@router.patch(
    "/products/{product_id}",
    response_model=ProductResponse,
)
def admin_update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = get_or_404(
        db,
        Product,
        product_id,
        "Product",
    )

    updates = payload.model_dump(exclude_unset=True)

    if updates.get("slug"):
        existing = db.scalar(
            select(Product).where(
                Product.slug == updates["slug"],
                Product.id != product_id,
            )
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Product slug already exists.",
            )

    if updates.get("category_id") is not None:
        get_or_404(
            db,
            Category,
            updates["category_id"],
            "Category",
        )

    for field, value in updates.items():
        setattr(product, field, value)

    commit_or_rollback(db)
    db.refresh(product)

    return product


@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def admin_delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = get_or_404(
        db,
        Product,
        product_id,
        "Product",
    )

    db.delete(product)
    commit_or_rollback(db)


# =========================================================
# ADMIN PRODUCT VARIANTS
# =========================================================

@router.get("/variants")
def admin_list_variants(
    product_id: int | None = Query(default=None, ge=1),
    search: str | None = Query(default=None, max_length=200),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = select(ProductVariant).options(
        selectinload(ProductVariant.inventory),
        selectinload(ProductVariant.product),
    )

    if product_id is not None:
        query = query.where(
            ProductVariant.product_id == product_id
        )

    if search:
        query = query.where(
            or_(
                ProductVariant.sku.ilike(f"%{search}%"),
                ProductVariant.size.ilike(f"%{search}%"),
                ProductVariant.color.ilike(f"%{search}%"),
            )
        )

    total = db.scalar(
        select(func.count()).select_from(
            query.order_by(None).subquery()
        )
    ) or 0

    variants = db.scalars(
        query.order_by(ProductVariant.id.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return {
        "items": [
            {
                **serialize_variant(variant),
                "product_name": (
                    variant.product.name
                    if variant.product
                    else None
                ),
            }
            for variant in variants
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post(
    "/products/{product_id}/variants",
    status_code=status.HTTP_201_CREATED,
)
def admin_create_variant(
    product_id: int,
    payload: AdminVariantCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = get_or_404(
        db,
        Product,
        product_id,
        "Product",
    )

    existing = db.scalar(
        select(ProductVariant).where(
            ProductVariant.sku == payload.sku
        )
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SKU already exists.",
        )

    variant = ProductVariant(
        product_id=product.id,
        sku=payload.sku,
        size=payload.size,
        color=payload.color,
        is_active=payload.is_active,
    )

    db.add(variant)
    db.flush()

    inventory = Inventory(
        variant_id=variant.id,
        stock_quantity=payload.stock_quantity,
        reserved_quantity=0,
        sold_quantity=0,
    )

    db.add(inventory)
    commit_or_rollback(db)
    db.refresh(variant)

    return serialize_variant(variant)


@router.get("/variants/{variant_id}")
def admin_get_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    variant = db.scalar(
        select(ProductVariant)
        .options(
            selectinload(ProductVariant.inventory),
            selectinload(ProductVariant.product),
        )
        .where(ProductVariant.id == variant_id)
    )

    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found.",
        )

    return {
        **serialize_variant(variant),
        "product_name": (
            variant.product.name
            if variant.product
            else None
        ),
    }


@router.patch("/variants/{variant_id}")
def admin_update_variant(
    variant_id: int,
    payload: AdminVariantUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    variant = get_or_404(
        db,
        ProductVariant,
        variant_id,
        "Product variant",
    )

    updates = payload.model_dump(exclude_unset=True)

    if updates.get("sku"):
        existing = db.scalar(
            select(ProductVariant).where(
                ProductVariant.sku == updates["sku"],
                ProductVariant.id != variant_id,
            )
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="SKU already exists.",
            )

    for field, value in updates.items():
        setattr(variant, field, value)

    commit_or_rollback(db)
    db.refresh(variant)

    return serialize_variant(variant)


@router.delete(
    "/variants/{variant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def admin_delete_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    variant = get_or_404(
        db,
        ProductVariant,
        variant_id,
        "Product variant",
    )

    from app.models import OrderItem

    ordered_variant = db.scalar(
        select(OrderItem.id)
        .where(OrderItem.variant_id == variant_id)
        .limit(1)
    )

    if ordered_variant:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This variant belongs to an order and cannot be deleted.",
        )

    db.delete(variant)
    commit_or_rollback(db)


# =========================================================
# ADMIN INVENTORY
# =========================================================

@router.get("/inventory")
def admin_list_inventory(
    search: str | None = Query(default=None, max_length=200),
    low_stock: bool = False,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = select(Inventory).options(
        selectinload(Inventory.variant).selectinload(
            ProductVariant.product
        )
    )

    if low_stock:
        query = query.where(
            Inventory.stock_quantity
            - Inventory.reserved_quantity <= 5
        )

    if search:
        query = query.join(
            Inventory.variant
        ).join(
            ProductVariant.product
        ).where(
            or_(
                Product.name.ilike(f"%{search}%"),
                ProductVariant.sku.ilike(f"%{search}%"),
            )
        )

    total = db.scalar(
        select(func.count()).select_from(
            query.order_by(None).subquery()
        )
    ) or 0

    records = db.scalars(
        query.order_by(Inventory.id.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    items = []

    for inventory in records:
        variant = inventory.variant

        items.append({
            **serialize_inventory(inventory),
            "variant": serialize_model(variant),
            "product": (
                serialize_model(variant.product)
                if variant and variant.product
                else None
            ),
        })

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/inventory/{inventory_id}")
def admin_get_inventory(
    inventory_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    inventory = db.scalar(
        select(Inventory)
        .options(
            selectinload(Inventory.variant).selectinload(
                ProductVariant.product
            )
        )
        .where(Inventory.id == inventory_id)
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found.",
        )

    variant = inventory.variant

    return {
        **serialize_inventory(inventory),
        "variant": serialize_model(variant),
        "product": (
            serialize_model(variant.product)
            if variant and variant.product
            else None
        ),
    }


@router.patch("/inventory/{inventory_id}")
def admin_update_inventory(
    inventory_id: int,
    payload: AdminInventoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    inventory = get_or_404(
        db,
        Inventory,
        inventory_id,
        "Inventory record",
    )

    updates = payload.model_dump(exclude_unset=True)

    new_stock = updates.get(
        "stock_quantity",
        inventory.stock_quantity,
    )

    new_reserved = updates.get(
        "reserved_quantity",
        inventory.reserved_quantity,
    )

    new_sold = updates.get(
        "sold_quantity",
        inventory.sold_quantity,
    )

    if new_reserved > new_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reserved quantity cannot exceed stock quantity.",
        )

    if new_sold > new_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sold quantity cannot exceed stock quantity.",
        )

    for field, value in updates.items():
        setattr(inventory, field, value)

    commit_or_rollback(db)
    db.refresh(inventory)

    return serialize_inventory(inventory)


# =========================================================
# ADMIN ORDERS
# =========================================================

@router.get("/orders")
def admin_list_orders(
    search: str | None = Query(default=None, max_length=200),
    order_status: str | None = Query(default=None),
    payment_status: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = load_order_query().options(
        selectinload(Order.user),
        selectinload(Order.items),
        selectinload(Order.status_history),
        selectinload(Order.payment),
    )

    if search:
        query = query.join(Order.user).where(
            or_(
                Order.order_number.ilike(f"%{search}%"),
                Order.shipping_full_name.ilike(f"%{search}%"),
                Order.shipping_phone.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )

    if order_status:
        query = query.where(
            Order.status == order_status.strip().upper()
        )

    if payment_status:
        query = query.where(
            Order.payment_status == payment_status.strip().upper()
        )

    total = db.scalar(
        select(func.count()).select_from(
            query.order_by(None).subquery()
        )
    ) or 0

    orders = db.scalars(
        query.order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).unique().all()

    return {
        "items": [
            serialize_admin_order(order)
            for order in orders
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/orders/{order_id}")
def admin_get_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    order = db.scalar(
        load_order_query()
        .options(
            selectinload(Order.user),
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.payment),
        )
        .where(Order.id == order_id)
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    return serialize_admin_order(order)


@router.patch("/orders/{order_id}/status")
def admin_update_order_status(
    order_id: int,
    payload: OrderStatusUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    order = db.scalar(
        load_order_query()
        .where(Order.id == order_id)
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    new_status = payload.status.strip().upper()

    valid_transitions = {
        "PENDING": {"CONFIRMED", "CANCELLED"},
        "CONFIRMED": {"PROCESSING", "CANCELLED"},
        "PROCESSING": {"SHIPPED", "CANCELLED"},
        "SHIPPED": {"OUT_FOR_DELIVERY"},
        "OUT_FOR_DELIVERY": {"DELIVERED"},
    }

    if new_status not in valid_transitions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order status.",
        )

    if new_status not in valid_transitions.get(order.status, set()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot change order status from "
                f"{order.status} to {new_status}."
            ),
        )

    try:
        if new_status == "CANCELLED":
            for item in order.items:
                inventory = db.scalar(
                    select(Inventory)
                    .where(
                        Inventory.variant_id == item.variant_id
                    )
                    .with_for_update()
                )

                if inventory:
                    if inventory.reserved_quantity < item.quantity:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="Insufficient reserved inventory to cancel this order.",
                        )

                    inventory.reserved_quantity -= item.quantity

        if new_status == "DELIVERED":
            for item in order.items:
                inventory = db.scalar(
                    select(Inventory)
                    .where(
                        Inventory.variant_id == item.variant_id
                    )
                    .with_for_update()
                )

                if not inventory:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Inventory record is missing for an ordered variant.",
                    )

                if (
                    inventory.reserved_quantity < item.quantity
                    or inventory.stock_quantity < item.quantity
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Insufficient inventory to complete delivery.",
                    )

                inventory.stock_quantity -= item.quantity
                inventory.reserved_quantity -= item.quantity
                inventory.sold_quantity += item.quantity

            order.payment_status = "PAID"

            if order.payment:
                order.payment.payment_status = "PAID"
                order.payment.paid_at = datetime.now(timezone.utc)

        order.status = new_status

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                status=new_status,
                note=(
                    payload.note.strip()
                    if payload.note
                    else f"Order status changed to {new_status} by admin."
                ),
            )
        )

        commit_or_rollback(db)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update order status.",
        )

    updated_order = db.scalar(
        load_order_query()
        .options(selectinload(Order.user))
        .where(Order.id == order_id)
    )

    return serialize_admin_order(updated_order)