from fastapi import APIRouter
from app.api.v1.endpoints import flights

api_router = APIRouter()
api_router.include_router(flights.router, prefix="/flights", tags=["flights"])
