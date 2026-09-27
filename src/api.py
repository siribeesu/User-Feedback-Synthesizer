from datetime import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

from src.client import HindsightMemoryClient
from src.config import get_bank_config, load_banks_config, settings
from importer import load_feedback_file

app = FastAPI(
    title="User Feedback Synthesizer API",
    description="Agentic User Feedback Synthesizer using Hindsight memory backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = HindsightMemoryClient()


class SingleFeedbackPayload(BaseModel):
    content: str
    bank_id: Optional[str] = None
    source: str = "App Store"
    user_id: Optional[str] = "usr_anon"
    user_name: Optional[str] = "Anonymous"
    segment: Optional[str] = "General"
    rating: int = Field(default=3, ge=1, le=5)
    title: Optional[str] = ""
    theme: Optional[str] = ""
    app_version: Optional[str] = "v2.3"
    timestamp: Optional[str] = None


class SearchQuery(BaseModel):
    query: str
    bank_id: Optional[str] = None
    source_type: Optional[str] = None
    min_rating: Optional[int] = None
    max_rating: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: int = 20


@app.get("/health")
def get_health():
    is_live = client.is_live()
    return {
        "status": "healthy",
        "hindsight_backend": "online" if is_live else "offline_embedded",
        "hindsight_url": client.base_url,
        "default_bank": settings.default_bank_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/banks")
def list_banks():
    banks = load_banks_config()
    res = {}
    for bid, b in banks.items():
        res[bid] = {
            "name": b.name,
            "product": b.product,
            "mission": b.mission,
            "disposition": b.disposition.dict(),
            "directives_count": len(b.directives),
            "mental_models_count": len(b.mental_models),
        }
    return res


@app.post("/banks/{bank_id}/setup")
def setup_bank_endpoint(bank_id: str):
    try:
        cfg = get_bank_config(bank_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    res = client.create_or_update_bank(cfg)
    return {"bank_id": bank_id, "result": res}


@app.post("/ingest")
def ingest_single_feedback(payload: SingleFeedbackPayload):
    bank_id = payload.bank_id or settings.default_bank_id
    ts = None
    if payload.timestamp:
        try:
            ts = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
        except Exception:
            ts = datetime.utcnow()

    metadata = {
        "source": payload.source,
        "user_id": payload.user_id or "usr_anon",
        "user_name": payload.user_name or "Anonymous",
        "segment": payload.segment or "General",
        "rating": str(payload.rating),
        "title": payload.title or "",
        "theme": payload.theme or "",
        "app_version": payload.app_version or "v2.3",
    }
    tags = [
        f"source:{payload.source.lower().replace(' ', '_')}",
        f"rating:{payload.rating}",
        f"version:{payload.app_version}",
    ]
    if payload.theme:
        tags.append(f"theme:{payload.theme}")

    resp = client.retain(
        bank_id=bank_id,
        content=payload.content,
        timestamp=ts,
        metadata=metadata,
        tags=tags,
    )
    return {
        "status": "retained",
        "bank_id": bank_id,
        "operation_id": getattr(resp, "operation_id", "done"),
        "success": getattr(resp, "success", True),
    }


@app.post("/ingest/batch")
async def ingest_batch_feedback(
    file: UploadFile = File(...),
    bank_id: str = Query(default="mobile-app-feedback"),
):
    temp_path = settings.data_dir / f"upload_{file.filename}"
    try:
        content_bytes = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content_bytes)

        items = load_feedback_file(temp_path)
        res = client.retain_batch(bank_id=bank_id, items=items)
        return {"status": "success", "file": file.filename, "retained_count": res["count"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass


@app.get("/search")
def search_feedback(
    query: str = Query(..., description="Free-text feedback query"),
    bank_id: str = Query(default="mobile-app-feedback"),
    source_type: Optional[str] = Query(None, description="App Store, Google Play, Zendesk, Discord, etc."),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    max_rating: Optional[int] = Query(None, ge=1, le=5),
    start_date: Optional[str] = Query(None, description="Filter ISO date start (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter ISO date end (YYYY-MM-DD)"),
    limit: int = Query(default=20, ge=1, le=100),
):
    """
    Search feedback endpoint wrapping Hindsight recall() with filters.
    """
    recall_resp = client.recall(
        bank_id=bank_id,
        query=query,
        source_type=source_type,
        min_rating=min_rating,
        max_rating=max_rating,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )
    results = getattr(recall_resp, "results", []) or []
    output_items = []
    for r in results:
        output_items.append({
            "id": r.id,
            "text": r.text,
            "metadata": r.metadata or {},
            "tags": r.tags or [],
            "timestamp": r.occurred_start,
        })
    return {
        "bank_id": bank_id,
        "query": query,
        "total_matches": len(output_items),
        "results": output_items,
    }


@app.post("/synthesize")
def trigger_synthesis(bank_id: str = Query(default="mobile-app-feedback")):
    from synthesize import generate_weekly_digest
    digest = generate_weekly_digest(bank_id=bank_id)
    return {
        "status": "completed",
        "bank_id": bank_id,
        "themes_count": digest["themes_count"],
        "total_sources_cited": digest["total_sources_cited"],
    }


@app.get("/themes")
def list_themes(bank_id: str = Query(default="mobile-app-feedback")):
    models = client.list_mental_models(bank_id=bank_id)
    out = []
    for m in models:
        out.append({
            "id": m["id"],
            "name": m["name"],
            "query": m["query"],
            "tags": m.get("tags", []),
            "evidence_count": m.get("evidence_count", 0),
            "last_refreshed": m.get("last_refreshed"),
            "observation_snippet": (m.get("observation") or "")[:200] + ("..." if m.get("observation") else ""),
        })
    out.sort(key=lambda x: x["evidence_count"], reverse=True)
    return {"bank_id": bank_id, "themes": out}


@app.get("/themes/{theme_id}")
def get_theme_detail(theme_id: str, bank_id: str = Query(default="mobile-app-feedback")):
    model = client.get_mental_model(bank_id=bank_id, mental_model_id=theme_id)
    if not model:
        raise HTTPException(status_code=404, detail=f"Theme '{theme_id}' not found.")
    history = client.get_mental_model_history(bank_id=bank_id, mental_model_id=theme_id)
    return {
        "theme": model,
        "history": history,
    }


@app.get("/digest")
def get_latest_digest(format: str = Query(default="json", pattern="^(json|markdown|html)$")):
    json_path = settings.output_dir / "digest.json"
    md_path = settings.output_dir / "digest.md"
    html_path = settings.output_dir / "digest.html"

    if format == "json":
        if json_path.exists():
            with open(json_path, "r", encoding="utf-8") as f:
                return json.load(f)
        raise HTTPException(status_code=404, detail="Digest not generated yet. Call POST /synthesize first.")
    elif format == "markdown":
        if md_path.exists():
            with open(md_path, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f"<pre style='white-space: pre-wrap;'>{f.read()}</pre>")
        raise HTTPException(status_code=404, detail="Markdown digest not found.")
    elif format == "html":
        if html_path.exists():
            with open(html_path, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read())
        raise HTTPException(status_code=404, detail="HTML digest not found.")
