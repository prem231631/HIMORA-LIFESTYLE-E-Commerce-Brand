
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "HIMORA LIFESTYLE API"
    app_env: str = "development"
    debug: bool = True

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 300

    database_url: str


    # Password reset email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    frontend_url: str = "http://localhost:5173"


    # eSewa ePay v2
    esewa_product_code: str = "EPAYTEST"
    esewa_secret_key: str = "8gBm/:&EnhH.1/q"
    esewa_payment_url: str = (
        "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
    )
    esewa_status_url: str = (
        "https://rc.esewa.com.np/api/epay/transaction/status/"
    )

    # These URLs must match the routes implemented in the app.
    esewa_success_url: str = (
        "http://localhost:5173/payment/esewa/success"
    )
    esewa_failure_url: str = (
        "http://localhost:5173/payment/esewa/failure"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
