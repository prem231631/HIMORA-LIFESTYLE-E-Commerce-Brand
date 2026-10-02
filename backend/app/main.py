from fastapi import FastAPI

from app.core.config import settings
from app.database.session import Base, engine
from app.models import (
    Category,
    Inventory,
    Product,
    ProductImage,
    ProductVariant,
)


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
)


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


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