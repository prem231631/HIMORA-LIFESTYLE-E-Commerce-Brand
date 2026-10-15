from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings

from app.routers.admin import router as admin_router
from app.routers.addresses import router as addresses_router
from app.routers.auth import router as auth_router
from app.routers.cart import router as cart_router
from app.routers.categories import router as categories_router
from app.routers.inventory import router as inventory_router
from app.routers.orders import router as orders_router
from app.routers.product_images import router as product_images_router
from app.routers.product_variant import router as product_variants_router
from app.routers.products import router as products_router

#Esewa
from app.routers.payments import router as payments_router

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
)


# =========================================================
# STATIC UPLOADS
# =========================================================

UPLOADS_ROOT = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOADS_ROOT)),
    name="uploads",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# API ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(admin_router)

app.include_router(categories_router)
app.include_router(products_router)
app.include_router(product_images_router)
app.include_router(product_variants_router)
app.include_router(inventory_router)

app.include_router(cart_router)
app.include_router(addresses_router)
app.include_router(orders_router)

app.include_router(payments_router)
# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "HIMORA LIFESTYLE API is running",
        "environment": settings.app_env,
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }