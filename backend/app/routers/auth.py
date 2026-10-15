from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.database.session import get_db
from app.models import Cart, User
from app.schemas import LoginRequest, LoginResponse, RegisterRequest, UpdateProfileRequest, UserResponse

from app.core.security import get_current_user

#SMTP Email
import smtplib
from email.message import EmailMessage
import jwt
from fastapi import BackgroundTasks
from app.core.config import settings
from app.core.security import(
    create_password_reset_token,
    decode_password_reset_token,
)
from app.schemas import(
    ForgotPasswordRequest,
    ResetPasswordRequest,
)

#Email Helper
def send_password_reset_email(email: str, token: str) -> None:
    message = EmailMessage()
    message["Subject"] = "Reset your HIMORA LIFESTYLE password"
    message["From"] = settings.smtp_from_email
    message["To"] = email

    reset_url = (
        f"{settings.frontend_url.rstrip('/')}"
        f"/reset-password?token={token}"
    )

    message.set_content(
        "We received a request to reset your HIMORA LIFESTYLE password.\n\n"
        f"Open this link to choose a new password:\n{reset_url}\n\n"
        "This link expires in 15 minutes. If you did not request "
        "a reset, you can ignore this email."
    )

    with smtplib.SMTP(
        settings.smtp_host,
        settings.smtp_port,
        timeout=15,
    ) as server:
        server.starttls()
        server.login(
            settings.smtp_username,
            settings.smtp_password,
        )
        server.send_message(message)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    user_data: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing_user = db.scalar(
        select(User).where(User.email == user_data.email)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    if user_data.phone:
        existing_phone = db.scalar(
            select(User).where(User.phone == user_data.phone)
        )

        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this phone number already exists.",
            )

    user = User(
        full_name=user_data.full_name.strip(),
        email=user_data.email.lower(),
        password_hash=hash_password(user_data.password),
        phone=user_data.phone,
        role="user",
        is_active=True,
    )

    db.add(user)
    db.flush()

    cart =Cart(
        user_id=user.id,
    )
    db.add(cart)
    db.commit()
    db.refresh(user)

    return user


@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(User.email == login_data.email.lower())
    )

    if not user or not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    access_token = create_access_token(user.id)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user



@router.patch(
    "/me",
    response_model=UserResponse,
)
def update_me(
    profile_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check whether the phone number belongs to another user.
    if profile_data.phone:
        existing_phone = db.scalar(
            select(User).where(
                User.phone == profile_data.phone,
                User.id != current_user.id,
            )
        )

        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This phone number is already registered.",
            )

    current_user.full_name = profile_data.full_name.strip()
    current_user.phone = profile_data.phone

    db.commit()
    db.refresh(current_user)

    return current_user




@router.post("/change-password")
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(
        password_data.current_password,
        current_user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password.",
        )

    current_user.password_hash = hash_password(
        password_data.new_password
    )

    db.commit()

    return {
        "message": "Password changed successfully."
    }


@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    generic_message = (
        "If an account exists for that email, "
        "a password reset link will be sent."
    )

    user = db.scalar(
        select(User).where(
            User.email == request.email.lower()
        )
    )

    if user and user.is_active:
        token = create_password_reset_token(user)

        background_tasks.add_task(
            send_password_reset_email,
            user.email,
            token,
        )

    return {"message": generic_message}