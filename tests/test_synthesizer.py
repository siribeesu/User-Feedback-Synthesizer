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
def client():
    c = HindsightMemoryClient()
    bank_cfg = get_bank_config("mobile-app-feedback")
    c.create_or_update_bank(bank_cfg)
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
    c.retain_batch(bank_id="mobile-app-feedback", items=test_items)
    return c


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
