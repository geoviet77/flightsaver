import pytest
from fastapi.testclient import TestClient
from main import app
from ai_travel_service import fallback_parse_travel_query, parse_search_query_ai

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "FlightSaver AI Travel API"

def test_parse_search_endpoint_standard():
    response = client.post("/api/v1/ai/parse-search", json={"query": "Москва Бангкок в сентябре на 2 недели"})
    assert response.status_code == 200
    data = response.json()
    assert data["origin_iata"] == "MOW"
    assert data["destination_iata"] == "BKK"
    assert data["duration_days"] == 14

def test_parse_search_endpoint_empty():
    response = client.post("/api/v1/ai/parse-search", json={"query": ""})
    assert response.status_code == 200
    data = response.json()
    assert data["origin_iata"] is None
    assert "Запрос пустой" in (data["explanation"] or "")

def test_fallback_parse_stpc_and_budget():
    result = fallback_parse_travel_query("Билеты из Казани в Рим в октябре на неделю с отелем STPC бюджет 75000 руб")
    assert result.origin_iata == "KZN"
    assert result.destination_iata == "FCO"
    assert result.duration_days == 7
    assert result.prefer_stpc_hotel is True
    assert result.max_budget == 75000.0
    assert "2026-10-01" in result.departure_date_range

def test_fallback_parse_regional_hubs():
    result_sochi = fallback_parse_travel_query("Сочи Дубай на 10 дней")
    assert result_sochi.origin_iata == "AER"
    assert result_sochi.destination_iata == "DXB"
    assert result_sochi.duration_days == 10

    result_spb = fallback_parse_travel_query("СПб Пхукет на 3 недели")
    assert result_spb.origin_iata == "LED"
    assert result_spb.destination_iata == "HKT"
    assert result_spb.duration_days == 21
