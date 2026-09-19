import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_api_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["detector"]["channel"] == "P-3"
    assert data["detector"]["loaded"] is True
    assert data["nasa_p3_dataset_loaded"] is True


def test_api_metrics(client):
    response = client.get("/api/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "nasa_68_channel_benchmark" in data
    assert "p3_demonstration" in data
    assert data["p3_demonstration"]["accuracy"] == 96.70
    assert data["nasa_68_channel_benchmark"]["accuracy"] == 80.39


def test_api_telemetry_ingest(client):
    payload = {
        "channel": "P-3",
        "timestamp": 5401,
        "value": 0.42
    }
    response = client.post("/api/telemetry", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["channel"] == "P-3"
    assert "score" in data
    assert "anomaly" in data


def test_api_events_lifecycle(client):
    # 1. List events
    res_list = client.get("/api/events")
    assert res_list.status_code == 200
    events = res_list.json()
    assert len(events) >= 1
    event_id = events[0]["event_id"]

    # 2. Analyze event with Gemini (or fallback engine)
    res_analyze = client.post(f"/api/events/{event_id}/analyze")
    assert res_analyze.status_code == 200
    analysis_data = res_analyze.json()
    assert "analysis" in analysis_data
    analysis = analysis_data["analysis"]
    assert "diagnosis" in analysis
    assert "severity" in analysis
    assert "confidence" in analysis
    assert "evidence" in analysis
    assert analysis["operator_approval_required"] is True

    # 3. Operator Approval
    approval_payload = {
        "approved": True,
        "officer": "Flight Director Gene Kranz",
        "note": "Verified anomaly within P-3 limits. Safe state initialized."
    }
    res_approve = client.post(f"/api/events/{event_id}/approve", json=approval_payload)
    assert res_approve.status_code == 200
    approve_data = res_approve.json()
    assert approve_data["event"]["status"] == "APPROVED"
    assert approve_data["event"]["operator_decision"]["officer"] == "Flight Director Gene Kranz"


def test_simulation_p3_data(client):
    response = client.get("/api/simulation/p3/data?start=5390&count=50")
    assert response.status_code == 200
    data = response.json()
    assert data["channel"] == "P-3"
    assert len(data["samples"]) == 50
    # verify event range flag
    assert any(s["is_event_range"] for s in data["samples"])
