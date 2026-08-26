from typing import List
from fastapi import APIRouter
from app.schemas import SearchRequest, FlightResult
from app.services.flight_search import search_flights_live

router = APIRouter()

@router.post("/search", response_model=List[FlightResult])
async def search_flights_endpoint(request: SearchRequest):
    return await search_flights_live(request)
