from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.categories import router as categories_router
from app.routers.products import router as products_router
from app.routers.product_images import router as product_images_router
from app.routers.product_variant import router as product_variants_router
from app.routers.inventory import router as inventory_router    
from app.routers.auth import router as auth_router
from app.routers.cart import router as cart_router
from app.routers.addresses import router as addresses_router
from app.routers.orders import router as orders_router

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(categories_router)
app.include_router(products_router)
app.include_router(product_images_router)
app.include_router(product_variants_router)
app.include_router(inventory_router)
app.include_router(auth_router)
app.include_router(cart_router)
app.include_router(addresses_router)
app.include_router(orders_router)

@app.get("/")
def root():
    return {
        "message": "HIMORA LIFESTYLE API is running",
        "environment": settings.app_env,
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}