from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models import Address, User
from app.schemas import AddressCreate, AddressResponse, AddressUpdate


router = APIRouter(
    prefix="/api/addresses",
    tags=["Addresses"],
)


def clear_default_addresses(
    db: Session,
    user_id: int,
    except_address_id: int | None = None,
) -> None:
    query = select(Address).where(
        Address.user_id == user_id,
        Address.is_active.is_(True),
        Address.is_default.is_(True),
    )

    if except_address_id is not None:
        query = query.where(Address.id != except_address_id)

    addresses = db.scalars(query).all()

    for address in addresses:
        address.is_default = False


@router.get(
    "",
    response_model=list[AddressResponse],
)
def get_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addresses = db.scalars(
        select(Address)
        .where(
            Address.user_id == current_user.id,
            Address.is_active.is_(True),
        )
        .order_by(Address.is_default.desc(), Address.created_at.desc())
    ).all()

    return addresses


@router.post(
    "",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_address(
    address_data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing_addresses = db.scalars(
        select(Address).where(
            Address.user_id == current_user.id,
            Address.is_active.is_(True),
        )
    ).all()

    should_be_default = (
        address_data.is_default or len(existing_addresses) == 0
    )

    if should_be_default:
        clear_default_addresses(db, current_user.id)

    address = Address(
        user_id=current_user.id,
        full_name=address_data.full_name.strip(),
        phone=address_data.phone.strip(),
        province=address_data.province.strip(),
        city=address_data.city.strip(),
        address_line=address_data.address_line.strip(),
        landmark=address_data.landmark.strip()
        if address_data.landmark
        else None,
        postal_code=address_data.postal_code.strip()
        if address_data.postal_code
        else None,
        is_default=should_be_default,
        is_active=True,
    )

    db.add(address)
    db.commit()
    db.refresh(address)

    return address


@router.get(
    "/{address_id}",
    response_model=AddressResponse,
)
def get_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    address = db.scalar(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == current_user.id,
            Address.is_active.is_(True),
        )
    )

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found.",
        )

    return address


@router.patch(
    "/{address_id}",
    response_model=AddressResponse,
)
def update_address(
    address_id: int,
    address_data: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    address = db.scalar(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == current_user.id,
            Address.is_active.is_(True),
        )
    )

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found.",
        )

    update_data = address_data.model_dump(exclude_unset=True)

    if update_data.get("is_default") is True:
        clear_default_addresses(
            db,
            current_user.id,
            except_address_id=address.id,
        )

    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()

        setattr(address, field, value)

    db.commit()
    db.refresh(address)

    return address


@router.delete(
    "/{address_id}",
    response_model=AddressResponse,
)
def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    address = db.scalar(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == current_user.id,
            Address.is_active.is_(True),
        )
    )

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found.",
        )

    was_default = address.is_default

    address.is_active = False
    address.is_default = False

    if was_default:
        replacement = db.scalar(
            select(Address)
            .where(
                Address.user_id == current_user.id,
                Address.is_active.is_(True),
                Address.id != address.id,
            )
            .order_by(Address.created_at.desc())
        )

        if replacement:
            replacement.is_default = True

    db.commit()
    db.refresh(address)

    return address