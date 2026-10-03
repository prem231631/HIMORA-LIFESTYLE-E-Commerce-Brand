from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.categories import router as categories_router
from app.routers.products import router as products_router
from app.routers.product_images import router as product_images_router

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

@app.get("/")
def root():
    return {
        "message": "HIMORA LIFESTYLE API is running",
        "environment": settings.app_env,
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}