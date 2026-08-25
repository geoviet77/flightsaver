import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ai_travel_service import AiParsedTravelRequest, AiParsedTravelResponse, parse_search_query_ai

app = FastAPI(
    title="FlightSaver AI Travel API",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "service": "FlightSaver AI Travel API", "version": "1.0.0"}

@app.post("/api/v1/ai/parse-search", response_model=AiParsedTravelResponse)
async def parse_search(request: AiParsedTravelRequest):
    try:
        result = await parse_search_query_ai(request.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
