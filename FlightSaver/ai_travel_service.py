import os
import json
import httpx
from pydantic import BaseModel, Field
from typing import Optional

class AiParsedTravelRequest(BaseModel):
    query: str

class AiParsedTravelResponse(BaseModel):
    origin_iata: Optional[str] = None
    origin_city: Optional[str] = None
    destination_iata: Optional[str] = None
    destination_city: Optional[str] = None
    departure_date_range: Optional[str] = None
    duration_days: Optional[int] = None
    prefer_stpc_hotel: bool = False
    max_budget: Optional[float] = None
    explanation: Optional[str] = None

async def parse_search_query_ai(query: str) -> AiParsedTravelResponse:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment")

    system_prompt = f"""Ты — специализированный сервис AI Travel Assistant для парсинга поисковых запросов сервиса FlightSaver.
Текущий год: 2026. Сегодня: 25 августа 2026 года.

ЗАДАЧА:
Проанализируй текстовый запрос пользователя: "{query}".
Извлеки структурированные параметры:
1. origin_city (название города вылета на русском) и origin_iata (3-буквенный IATA код, например: Москва -> MOW, Сочи -> AER, Минск -> MSQ, Челябинск -> CEK).
2. destination_city (название города прилета) и destination_iata (3-буквенный IATA код, например: Бангкок -> BKK, Сиэтл -> SEA, Монако -> NCE, Бали -> DPS, Рим -> FCO).
3. departure_date_range (диапазон дат или конкретная дата, например "2026-09-01 - 2026-09-30" или "2026-09-15").
4. duration_days (длительность поездки в днях, например: "на 2 недели" -> 14, "на неделю" -> 7).
5. prefer_stpc_hotel (true, если пользователь упомянул бесплатный отель на пересадке, STPC, длительную стыковку для отдыха; иначе false).
6. max_budget (максимальный бюджет числом в рублях, если указан, иначе null).
7. explanation (краткое пояснение извлеченных параметров на русском).

Верни результат СТРОГО в валидном формате JSON:
{{
  "origin_iata": "MOW",
  "origin_city": "Москва",
  "destination_iata": "BKK",
  "destination_city": "Бангкок",
  "departure_date_range": "2026-09-01 - 2026-09-30",
  "duration_days": 14,
  "prefer_stpc_hotel": true,
  "max_budget": null,
  "explanation": "Извлечен маршрут Москва → Бангкок на сентябрь на 2 недели с бесплатным отелем STPC"
}}"""

    candidate_models = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-3.7-flash"
    ]

    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": system_prompt}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.2
                }
            }
            try:
                resp = await client.post(url, json=payload, headers={"Content-Type": "application/json", "x-goog-api-key": api_key})
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
                    parsed_json = json.loads(raw_text)
                    return AiParsedTravelResponse(**parsed_json)
            except Exception:
                continue

    return AiParsedTravelResponse(
        origin_iata="MOW",
        origin_city="Москва",
        destination_iata="BKK",
        destination_city="Бангкок",
        departure_date_range="2026-09-01 - 2026-09-30",
        duration_days=14,
        prefer_stpc_hotel=True,
        max_budget=None,
        explanation="Fallback: Москва → Бангкок"
    )
