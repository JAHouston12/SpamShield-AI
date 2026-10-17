from fastapi import APIRouter

from app.api.v1.routes import health, insights, predict

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(insights.router)
api_router.include_router(predict.router)
