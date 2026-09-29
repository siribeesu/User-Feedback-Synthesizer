import sys
from pathlib import Path
import pytest

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from datetime import datetime
from fastapi.testclient import TestClient

from src.config import load_banks_config, get_bank_config, settings
from src.client import HindsightMemoryClient
from src.api import app


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    from src.api import client as api_client
    temp_file = tmp_path_factory.mktemp("test_storage") / "test_bank.json"
    
    orig_file = api_client.storage_file
    api_client.storage_file = temp_file
    api_client._ensure_storage()

    bank_cfg = get_bank_config("mobile-app-feedback")
    api_client.create_or_update_bank(bank_cfg)
    test_items = [
        {
            "id": "FB-TEST-001",
            "content": "Checkout crashed with gateway timeout when pressing payment submit on v2.3.",
            "source": "Zendesk",
            "rating": 1,
            "app_version": "v2.3",
            "user_name": "Test User",
            "segment": "Enterprise",
        },
        {
            "id": "FB-TEST-002",
            "content": "Fast and smooth checkout payment in v2.2 with Apple Pay.",
            "source": "App Store",
            "rating": 5,
            "app_version": "v2.2",
            "user_name": "Happy User",
            "segment": "Pro",
        },
    ]
    api_client.retain_batch(bank_id="mobile-app-feedback", items=test_items)
    
    yield api_client

    api_client.storage_file = orig_file


@pytest.fixture(scope="module")
def api_test_client(client):
    return TestClient(app)


def test_bank_configuration():
    banks = load_banks_config()
    assert "mobile-app-feedback" in banks
    cfg = banks["mobile-app-feedback"]
    assert cfg.product == "Mobile App"
    assert "product feedback analyst" in cfg.mission
    assert cfg.disposition.skepticism == 5
    assert cfg.disposition.agreeableness == 1
    assert len(cfg.directives) >= 2
    assert len(cfg.mental_models) >= 4


def test_retain_and_storage(client):
    bank_id = "test-bank"
    test_item = {
        "id": "FB-TEST-001",
        "content": "The application crashed when pressing payment submit on v2.3.",
        "source": "Zendesk",
        "rating": 1,
        "app_version": "v2.3",
        "user_name": "Test User",
        "segment": "Enterprise",
    }
    res = client.retain_batch(bank_id=bank_id, items=[test_item])
    assert res["count"] >= 1

    # Recall should find it
    recall_res = client.recall(bank_id=bank_id, query="payment submit")
    assert len(recall_res.results) >= 1
    matched = recall_res.results[0]
    assert "crashed when pressing payment submit" in matched.text
    assert matched.metadata.get("rating") == "1"


def test_recall_filters(client):
    bank_id = "mobile-app-feedback"
    # Search for checkout bugs with rating 1
    res = client.recall(
        bank_id=bank_id,
        query="checkout",
        min_rating=1,
        max_rating=2,
    )
    assert len(res.results) > 0
    for r in res.results:
        rating = int(r.metadata.get("rating", 3))
        assert rating <= 2


def test_reflect_grounding(client):
    bank_id = "mobile-app-feedback"
    resp = client.reflect(bank_id=bank_id, query="checkout bugs and gateway timeouts")
    assert resp.text is not None
    assert "Grounded in" in resp.text
    assert resp.based_on is not None
    assert len(resp.based_on.memories) > 0
    # Fact citations must exist
    for f in resp.based_on.memories[:3]:
        assert f.text is not None
        assert f.context is not None


def test_temporal_shift_detection(client):
    bank_id = "mobile-app-feedback"
    # Mental model for release v2.3 stability
    mm = client.refresh_mental_model(bank_id=bank_id, mental_model_id="release-v23-stability")
    obs = mm.get("observation", "")
    assert "TEMPORAL SHIFT DETECTED" in obs
    assert "v2.2" in obs
    assert "v2.3" in obs


def test_api_health_endpoint(api_test_client):
    resp = api_test_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "hindsight_backend" in data


def test_api_search_endpoint(api_test_client):
    resp = api_test_client.get("/search?query=checkout&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
    assert data["total_matches"] > 0


def test_api_themes_endpoint(api_test_client):
    resp = api_test_client.get("/themes?bank_id=mobile-app-feedback")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["themes"]) >= 4


# ──────────────────────────────────────────────────────────────
# PulseIQ 2.0 — New endpoint tests
# ──────────────────────────────────────────────────────────────

def test_analytics_dashboard(api_test_client):
    resp = api_test_client.get("/analytics/dashboard?bank_id=mobile-app-feedback")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_feedback" in data
    assert data["total_feedback"] > 0
    assert "positive_pct" in data
    assert "negative_pct" in data
    assert "source_breakdown" in data
    assert "version_breakdown" in data
    assert "avg_rating" in data
    assert isinstance(data["ai_insights"], list)


def test_analytics_sentiment_trend(api_test_client):
    resp = api_test_client.get("/analytics/sentiment-trend?bank_id=mobile-app-feedback")
    assert resp.status_code == 200
    data = resp.json()
    assert "trend" in data
    assert isinstance(data["trend"], list)
    if data["trend"]:
        first = data["trend"][0]
        assert "date" in first
        assert "positive" in first
        assert "negative" in first


def test_analytics_release_impact(api_test_client):
    resp = api_test_client.get("/analytics/release-impact?bank_id=mobile-app-feedback")
    assert resp.status_code == 200
    data = resp.json()
    assert "versions" in data
    assert isinstance(data["versions"], list)
    assert len(data["versions"]) >= 2
    for v in data["versions"]:
        assert "version" in v
        assert "avg_rating" in v
        assert "count" in v


def test_analytics_feature_opportunities(api_test_client):
    resp = api_test_client.get("/analytics/feature-opportunities?bank_id=mobile-app-feedback")
    assert resp.status_code == 200
    data = resp.json()
    assert "opportunities" in data
    assert isinstance(data["opportunities"], list)


def test_memory_inspect(api_test_client):
    resp = api_test_client.get("/memory/inspect?bank_id=mobile-app-feedback&limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert "memories" in data
    assert "total" in data
    assert data["total"] > 0
    assert len(data["memories"]) <= 10


def test_memory_timeline(api_test_client):
    resp = api_test_client.get("/memory/timeline/onboarding-friction?bank_id=mobile-app-feedback")
    assert resp.status_code == 200
    data = resp.json()
    assert "theme_id" in data
    assert "theme_name" in data
    assert "timeline" in data
    assert isinstance(data["timeline"], list)


def test_copilot_ask(api_test_client):
    payload = {"question": "What are the biggest pain points?", "bank_id": "mobile-app-feedback"}
    resp = api_test_client.post("/copilot/ask", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert len(data["answer"]) > 10
    assert "evidence" in data
    assert isinstance(data["evidence"], list)
    assert "suggested_questions" in data
    assert len(data["suggested_questions"]) >= 3


def test_copilot_suggested_questions_when_empty(api_test_client):
    payload = {"question": "", "bank_id": "mobile-app-feedback"}
    resp = api_test_client.post("/copilot/ask", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["suggested_questions"]) >= 3


def test_resolutions_crud(api_test_client):
    # Create
    payload = {
        "title": "Checkout crash on v2.3",
        "description": "Payment gateway timeout causing checkout failures",
        "theme_id": "release-v23-stability",
        "severity": "critical",
        "status": "detected",
        "assigned_to": "eng-team",
        "notes": "Detected via Zendesk tickets"
    }
    create_resp = api_test_client.post("/resolutions", json=payload)
    assert create_resp.status_code == 200
    resp_json = create_resp.json()
    # API returns {"resolution": {...}} or flat dict
    created = resp_json.get("resolution", resp_json)
    assert created["title"] == payload["title"]
    assert "id" in created
    resolution_id = created["id"]

    # List — returns list of resolutions (either as list or {"resolutions": [...]})
    list_resp = api_test_client.get("/resolutions")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    resolutions = list_data if isinstance(list_data, list) else list_data.get("resolutions", [])
    assert isinstance(resolutions, list)
    ids = [r["id"] for r in resolutions]
    assert resolution_id in ids

    # Get single
    get_resp = api_test_client.get(f"/resolutions/{resolution_id}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    item = get_data.get("resolution", get_data)
    assert item["id"] == resolution_id

    # Update status
    patch_resp = api_test_client.patch(f"/resolutions/{resolution_id}", json={"status": "investigating"})
    assert patch_resp.status_code == 200
    patch_data = patch_resp.json()
    updated = patch_data.get("resolution", patch_data)
    assert updated["status"] == "investigating"

    # Delete
    del_resp = api_test_client.delete(f"/resolutions/{resolution_id}")
    assert del_resp.status_code == 200


def test_model_health(api_test_client):
    resp = api_test_client.get("/analytics/model-health")
    assert resp.status_code == 200
    data = resp.json()
    assert "models" in data
    assert "sentiment" in data["models"]
    assert "emotion" in data["models"]
    assert "embeddings" in data["models"]
    assert "fallback_active" in data


def test_ai_pipeline_fallback():
    """Verify ai_pipeline classify_feedback works even without transformers installed."""
    from src.ai_pipeline import classify_feedback, batch_classify
    result = classify_feedback("The app crashed and I lost all my data")
    assert "sentiment" in result
    assert result["sentiment"] in ("positive", "neutral", "negative")

    results = batch_classify(["great app!", "terrible crash bug"])
    assert len(results) == 2
