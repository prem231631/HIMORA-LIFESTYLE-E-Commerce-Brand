from fastapi import FastAPI

from app.core.config import settings
from app.models import (
    Category,
    Inventory,
    Product,
    ProductImage,
    ProductVariant,
)

from app.routers.products import router as proudcts_router


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
)

app.include_router(proudcts_router)

@app.get("/")
def root():
    return {
        "message": "HIMORA LIFESTYLE API is running",
        "environment": settings.app_env,
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }