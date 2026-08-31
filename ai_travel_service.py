import os
import re
import json
import httpx
from pydantic import BaseModel
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

# Словарная база городов с корнями для учета склонений русского языка
CITY_STEM_MAP = [
    ('москв', 'Москва', 'MOW'),
    ('мск', 'Москва', 'MOW'),
    ('шереметьев', 'Москва', 'SVO'),
    ('домодедов', 'Москва', 'DME'),
    ('внуков', 'Москва', 'VKO'),
    ('санкт-петербург', 'Санкт-Петербург', 'LED'),
    ('петербург', 'Санкт-Петербург', 'LED'),
    ('питер', 'Санкт-Петербург', 'LED'),
    ('спб', 'Санкт-Петербург', 'LED'),
    ('сочи', 'Сочи', 'AER'),
    ('адлер', 'Сочи', 'AER'),
    ('казан', 'Казань', 'KZN'),
    ('самар', 'Самара', 'KUF'),
    ('екатеринбург', 'Екатеринбург', 'SVX'),
    ('новосибирск', 'Новосибирск', 'OVB'),
    ('челябинск', 'Челябинск', 'CEK'),
    ('уфа', 'Уфа', 'UFA'),
    ('уфе', 'Уфа', 'UFA'),
    ('уфы', 'Уфа', 'UFA'),
    ('красноярск', 'Красноярск', 'KJA'),
    ('иркутск', 'Иркутск', 'IKT'),
    ('владивосток', 'Владивосток', 'VVO'),
    ('хабаровск', 'Хабаровск', 'KHV'),
    ('южно-сахалинск', 'Южно-Сахалинск', 'UUS'),
    ('сахалин', 'Южно-Сахалинск', 'UUS'),
    ('минск', 'Минск', 'MSQ'),
    ('бангкок', 'Бангкок', 'BKK'),
    ('пхукет', 'Пхукет', 'HKT'),
    ('самуи', 'Самуи', 'USM'),
    ('дубай', 'Дубай', 'DXB'),
    ('доха', 'Доха', 'DOH'),
    ('абу-даби', 'Абу-Даби', 'AUH'),
    ('стамбул', 'Стамбул', 'IST'),
    ('анталья', 'Анталья', 'AYT'),
    ('рим', 'Рим', 'FCO'),
    ('париж', 'Париж', 'CDG'),
    ('лондон', 'Лондон', 'LON'),
    ('сиэтл', 'Сиэтл', 'SEA'),
    ('нью-йорк', 'Нью-Йорк', 'NYC'),
    ('лос-анджелес', 'Лос-Анджелес', 'LAX'),
    ('монако', 'Монако (Ницца)', 'NCE'),
    ('ницц', 'Ницца', 'NCE'),
    ('бали', 'Бали (Денпасар)', 'DPS'),
    ('денпасар', 'Бали (Денпасар)', 'DPS'),
    ('пекин', 'Пекин', 'PEK'),
    ('гуанчжоу', 'Гуанчжоу', 'CAN'),
    ('шанхай', 'Шанхай', 'SHA'),
    ('гонконг', 'Гонконг', 'HKG'),
    ('токио', 'Токио', 'TYO'),
    ('сеул', 'Сеул', 'ICN'),
    ('мале', 'Мале', 'MLE'),
    ('мальдив', 'Мале', 'MLE'),
]

def fallback_parse_travel_query(query: str) -> AiParsedTravelResponse:
    if not query or not query.strip():
        return AiParsedTravelResponse(
            origin_iata=None,
            origin_city=None,
            destination_iata=None,
            destination_city=None,
            departure_date_range=None,
            duration_days=None,
            prefer_stpc_hotel=False,
            max_budget=None,
            explanation="Запрос пустой. Укажите направление и даты."
        )

    lower = query.lower()

    # 1. Поиск предлогов «из [A] в [B]»
    from_match = re.search(r'из\s+([а-яa-z\-]+)', lower)
    to_match = re.search(r'(?:в|до|на)\s+([а-яa-z\-]+)', lower)

    origin_city, origin_iata = None, None
    dest_city, dest_iata = None, None

    if from_match:
        from_word = from_match.group(1)
        for stem, c_name, c_iata in CITY_STEM_MAP:
            if stem in from_word:
                origin_city, origin_iata = c_name, c_iata
                break

    if to_match:
        to_word = to_match.group(1)
        # Исключаем служебные слова
        if to_word not in ['сентябре', 'октябре', 'ноябре', 'декабре', 'январе', 'мае', 'неделю', 'недели', 'дней', 'отпуск', 'выходные', 'выходных']:
            for stem, c_name, c_iata in CITY_STEM_MAP:
                if stem in to_word:
                    dest_city, dest_iata = c_name, c_iata
                    break

    # 2. Если по предлогам не определили — извлекаем по порядку упоминания в строке
    if not origin_iata or not dest_iata:
        matched_cities = []
        for stem, c_name, c_iata in CITY_STEM_MAP:
            idx = lower.find(stem)
            if idx != -1:
                # Избегаем дублирования одного и того же города
                if not any(m[2] == c_iata for m in matched_cities):
                    matched_cities.append((idx, c_name, c_iata))

        matched_cities.sort(key=lambda x: x[0])

        if len(matched_cities) >= 2:
            if not origin_iata:
                origin_city, origin_iata = matched_cities[0][1], matched_cities[0][2]
            if not dest_iata:
                dest_city, dest_iata = matched_cities[1][1], matched_cities[1][2]
        elif len(matched_cities) == 1:
            if not dest_iata and origin_iata != matched_cities[0][2]:
                dest_city, dest_iata = matched_cities[0][1], matched_cities[0][2]
            elif not origin_iata:
                origin_city, origin_iata = matched_cities[0][1], matched_cities[0][2]

    # Базовые значения по умолчанию при неполном вводе
    if not origin_iata and not dest_iata:
        origin_city, origin_iata = 'Москва', 'MOW'
        dest_city, dest_iata = 'Бангкок', 'BKK'
    elif not origin_iata:
        origin_city, origin_iata = ('Москва', 'MOW') if dest_iata != 'MOW' else ('Рим', 'FCO')
    elif not dest_iata:
        dest_city, dest_iata = ('Бангкок', 'BKK') if origin_iata != 'BKK' else ('Дубай', 'DXB')

    # 3. Определение дат
    dep_range = None
    if 'сентябр' in lower:
        dep_range = '2026-09-01 - 2026-09-30'
    elif 'октябр' in lower:
        dep_range = '2026-10-01 - 2026-10-31'
    elif 'ноябр' in lower:
        dep_range = '2026-11-01 - 2026-11-30'
    elif 'декабр' in lower or 'новый год' in lower or 'новогод' in lower:
        dep_range = '2026-12-25 - 2027-01-10'
    elif 'январ' in lower:
        dep_range = '2027-01-01 - 2027-01-31'
    elif 'май' in lower or 'майск' in lower:
        dep_range = '2027-05-01 - 2027-05-15'
    else:
        dep_range = '2026-09-15'

    # 4. Определение длительности поездки
    duration = None
    weeks_match = re.search(r'(\d+)\s*(?:недел|нед)', lower)
    days_match = re.search(r'(\d+)\s*(?:дней|дня|день|дн)', lower)

    if weeks_match:
        duration = int(weeks_match.group(1)) * 7
    elif days_match:
        duration = int(days_match.group(1))
    elif 'две недели' in lower or '2 недели' in lower:
        duration = 14
    elif 'три недели' in lower or '3 недели' in lower:
        duration = 21
    elif 'недел' in lower or '7 дн' in lower:
        duration = 7
    elif 'месяц' in lower or '30 дн' in lower:
        duration = 30

    # 5. STPC отель
    prefer_stpc = bool(re.search(r'stpc|отел|стыковк|пересадк|отдых', lower))

    # 6. Бюджет
    budget = None
    budget_match = re.search(r'(?:бюджет|до|максимум)\s*[:=]?\s*(\d+[\d\s]*)\s*(?:руб|р|\$|usd|eur)?', lower)
    if budget_match:
        try:
            budget = float(budget_match.group(1).replace(' ', ''))
        except ValueError:
            budget = None

    explanation = f"Маршрут {origin_city} ({origin_iata}) → {dest_city} ({dest_iata})"
    if dep_range:
        explanation += f", даты: {dep_range}"
    if duration:
        explanation += f", на {duration} дней"
    if prefer_stpc:
        explanation += " с бесплатным отелем STPC"
    if budget:
        explanation += f", бюджет до {int(budget):,} ₽"

    return AiParsedTravelResponse(
        origin_iata=origin_iata,
        origin_city=origin_city,
        destination_iata=dest_iata,
        destination_city=dest_city,
        departure_date_range=dep_range,
        duration_days=duration or 14,
        prefer_stpc_hotel=prefer_stpc,
        max_budget=budget,
        explanation=explanation
    )

async def parse_search_query_ai(query: str) -> AiParsedTravelResponse:
    if not query or not query.strip():
        return fallback_parse_travel_query(query)

    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if api_key:
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

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
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
        except Exception:
            pass

    return fallback_parse_travel_query(query)
