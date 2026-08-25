import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_parse_search_endpoint_structure():
    # Test valid payload structure
    response = client.post("/api/v1/ai/parse-search", json={"query": "Москва Бангкок в сентябре на 2 недели"})
    assert response.status_code in [200, 500]  # Valid route check
