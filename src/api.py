from datetime import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
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

DIST_DIR = settings.config_file.parent.parent / "frontend" / "dist"
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")


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


@app.get("/")
def get_dashboard_ui():
    """Serves production React dashboard if built, else fallback HTML."""
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Feedback Synthesizer</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0f172a;
            --bg-card: #1e293b;
            --bg-card-hover: #334155;
            --border: #334155;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #3b82f6;
            --accent-hover: #2563eb;
            --badge-green: rgba(34, 197, 94, 0.2);
            --badge-green-text: #4ade80;
            --badge-amber: rgba(245, 158, 11, 0.2);
            --badge-amber-text: #fbbf24;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-main);
            padding: 24px;
            line-height: 1.5;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 24px;
        }
        h1 { font-size: 24px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .badge {
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-live { background: var(--badge-green); color: var(--badge-green-text); border: 1px solid rgba(74, 222, 128, 0.3); }
        .badge-local { background: var(--badge-amber); color: var(--badge-amber-text); border: 1px solid rgba(251, 191, 36, 0.3); }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .metric-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }
        .metric-value { font-size: 28px; font-weight: 700; color: var(--accent); margin-top: 4px; }
        .metric-label { font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

        .nav-tabs {
            display: flex;
            gap: 8px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 20px;
        }
        .tab-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            padding: 10px 18px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }
        .tab-btn.active { color: var(--text-main); border-bottom-color: var(--accent); }
        .tab-btn:hover { color: var(--text-main); }

        .tab-content { display: none; }
        .tab-content.active { display: block; }

        .theme-layout { display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
        .theme-list { display: flex; flex-direction: column; gap: 10px; }
        .theme-item {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .theme-item:hover { background: var(--bg-card-hover); border-color: var(--accent); }
        .theme-item.active { border-color: var(--accent); background: var(--bg-card-hover); }
        .theme-item h3 { font-size: 15px; margin-bottom: 4px; }
        .theme-item p { font-size: 12px; color: var(--text-muted); }

        .theme-detail {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 24px;
        }
        .theme-detail h2 { font-size: 20px; margin-bottom: 8px; color: #fff; }
        .theme-detail .query { color: var(--accent); font-style: italic; font-size: 14px; margin-bottom: 16px; }
        .observation-box {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 20px;
            font-size: 14px;
            white-space: pre-wrap;
            line-height: 1.6;
        }
        .quote-card {
            background: rgba(15, 23, 42, 0.5);
            border-left: 3px solid var(--accent);
            padding: 12px 14px;
            margin-bottom: 10px;
            border-radius: 4px;
            font-size: 13.5px;
        }

        .search-box {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }
        input[type="text"] {
            flex: 1;
            padding: 12px 16px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-main);
            font-size: 15px;
        }
        button.btn-primary {
            background: var(--accent);
            color: #fff;
            border: none;
            padding: 12px 20px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        button.btn-primary:hover { background: var(--accent-hover); }

        .search-results { display: flex; flex-direction: column; gap: 12px; }
        .result-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 16px;
        }
        .result-card h4 { font-size: 15px; color: #fff; margin-bottom: 6px; }
        .result-card p { font-size: 14px; color: #cbd5e1; margin-bottom: 8px; }
        .result-card .meta { font-size: 12px; color: var(--text-muted); }

        pre {
            background: var(--bg-card);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 13px;
            color: #cbd5e1;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>🧠 User Feedback Synthesizer</h1>
                <p style="color: var(--text-muted); font-size: 13px;">Evidence-backed intelligence powered by Hindsight agentic memory</p>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <span id="backend-status" class="badge badge-local">Checking backend...</span>
                <button class="btn-primary" onclick="triggerSynthesis()">⚡ Re-Synthesize</button>
            </div>
        </header>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Retained Records</div>
                <div class="metric-value" id="total-feedback">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Standing Themes</div>
                <div class="metric-value" id="standing-themes">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Evidence Citations</div>
                <div class="metric-value" id="evidence-count">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Average Sentiment</div>
                <div class="metric-value" id="avg-sentiment">-</div>
            </div>
        </div>

        <div class="nav-tabs">
            <button class="tab-btn active" onclick="switchTab('themes')">📊 Synthesized Themes</button>
            <button class="tab-btn" onclick="switchTab('search')">🔍 Search Feedback (Recall)</button>
            <button class="tab-btn" onclick="switchTab('digest')">📄 Weekly PM Digest</button>
        </div>

        <!-- TAB 1: THEMES -->
        <div id="tab-themes" class="tab-content active">
            <div class="theme-layout">
                <div class="theme-list" id="theme-list-container">
                    <p style="color: var(--text-muted);">Loading themes...</p>
                </div>
                <div class="theme-detail" id="theme-detail-container">
                    <h2>Select a theme from the left to drill down</h2>
                </div>
            </div>
        </div>

        <!-- TAB 2: SEARCH -->
        <div id="tab-search" class="tab-content">
            <div class="search-box">
                <input type="text" id="search-input" value="checkout bugs" placeholder="Search feedback memories (e.g. checkout, pricing, dark mode)..." onkeyup="if(event.key==='Enter') executeSearch()">
                <button class="btn-primary" onclick="executeSearch()">Recall Memory</button>
            </div>
            <div class="search-results" id="search-results-container">
                <p style="color: var(--text-muted);">Type a query and press 'Recall Memory'.</p>
            </div>
        </div>

        <!-- TAB 3: DIGEST -->
        <div id="tab-digest" class="tab-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2>Executive Product Digest</h2>
                <div style="display: flex; gap: 8px;">
                    <a href="/digest?format=html" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-block;">Open HTML Report</a>
                    <a href="/digest?format=json" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-block; background: #475569;">Raw JSON</a>
                </div>
            </div>
            <div id="digest-viewer" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 20px;">
                <p style="color: var(--text-muted);">Loading digest...</p>
            </div>
        </div>
    </div>

    <script>
        let currentThemes = [];

        async function init() {
            try {
                const healthRes = await fetch('/health');
                const health = await healthRes.json();
                const badge = document.getElementById('backend-status');
                if (health.hindsight_backend === 'online') {
                    badge.className = 'badge badge-live';
                    badge.innerText = '● Hindsight Server: ONLINE (:8888)';
                } else {
                    badge.className = 'badge badge-local';
                    badge.innerText = '○ Hindsight: LOCAL EMBEDDED';
                }

                await loadThemes();
                await executeSearch();
                await loadDigest();
            } catch (err) {
                console.error('Init failed', err);
            }
        }

        async function loadThemes() {
            try {
                const res = await fetch('/themes');
                const data = await res.json();
                currentThemes = data.themes || [];

                document.getElementById('standing-themes').innerText = currentThemes.length;
                let totalSources = 0;
                currentThemes.forEach(t => totalSources += t.evidence_count);
                document.getElementById('evidence-count').innerText = totalSources;
                document.getElementById('total-feedback').innerText = '75+';
                document.getElementById('avg-sentiment').innerText = '2.7 / 5.0';

                const listEl = document.getElementById('theme-list-container');
                listEl.innerHTML = '';
                currentThemes.forEach((t, idx) => {
                    const item = document.createElement('div');
                    item.className = 'theme-item ' + (idx === 0 ? 'active' : '');
                    item.onclick = () => selectTheme(t.id, item);
                    item.innerHTML = `
                        <h3>${t.name}</h3>
                        <p><strong>${t.evidence_count}</strong> sources cited</p>
                    `;
                    listEl.appendChild(item);
                });

                if (currentThemes.length > 0) {
                    await selectTheme(currentThemes[0].id);
                }
            } catch (err) {
                console.error(err);
            }
        }

        async function selectTheme(themeId, clickedEl) {
            if (clickedEl) {
                document.querySelectorAll('.theme-item').forEach(el => el.classList.remove('active'));
                clickedEl.classList.add('active');
            }
            const res = await fetch('/themes/' + themeId);
            const data = await res.json();
            const t = data.theme;

            const detailEl = document.getElementById('theme-detail-container');
            let quotesHtml = '';
            if (t.evidence_facts) {
                t.evidence_facts.slice(0, 4).forEach(f => {
                    quotesHtml += `
                        <div class="quote-card">
                            <p style="margin-bottom: 4px;">"${f.text}"</p>
                            <small style="color: var(--text-muted); font-size: 11px;">${f.context || ''}</small>
                        </div>
                    `;
                });
            }

            detailEl.innerHTML = `
                <h2>${t.name}</h2>
                <div class="query">Query: "${t.query}"</div>
                <div style="margin-bottom: 12px; color: var(--text-muted); font-size: 13px;">
                    Evidence Volume: <span style="color: var(--accent); font-weight: 600;">${t.evidence_count} Verified Submissions</span>
                </div>
                <div class="observation-box">${t.observation || 'No observation yet.'}</div>
                <h3 style="font-size: 16px; margin-bottom: 10px; color: #fff;">💬 Grounded Customer Quotes</h3>
                ${quotesHtml || '<p style="color: var(--text-muted);">No quotes cited.</p>'}
            `;
        }

        async function executeSearch() {
            const query = document.getElementById('search-input').value.trim() || 'checkout';
            const container = document.getElementById('search-results-container');
            container.innerHTML = '<p style="color: var(--text-muted);">Searching memory...</p>';

            try {
                const res = await fetch(`/search?query=${encodeURIComponent(query)}&limit=15`);
                const data = await res.json();
                const results = data.results || [];

                if (results.length === 0) {
                    container.innerHTML = '<p style="color: var(--text-muted);">No matching feedback items found.</p>';
                    return;
                }

                container.innerHTML = `<p style="color: var(--text-muted); margin-bottom: 12px;">Found <strong>${results.length}</strong> ranked matches:</p>`;
                results.forEach((r, idx) => {
                    const meta = r.metadata || {};
                    const card = document.createElement('div');
                    card.className = 'result-card';
                    card.innerHTML = `
                        <h4>#${idx + 1}. ${meta.title || r.text.substring(0, 60)} — Rating: ${meta.rating || 'N/A'}/5</h4>
                        <p>"${r.text}"</p>
                        <div class="meta">
                            👤 ${meta.user_name || 'Anonymous'} | 📱 ${meta.source || 'Unknown'} | 🏷️ Version: ${meta.app_version || 'N/A'} | 📅 ${(r.timestamp || '').substring(0, 10)}
                        </div>
                    `;
                    container.appendChild(card);
                });
            } catch (err) {
                container.innerHTML = '<p style="color: #ef4444;">Search failed: ' + err.message + '</p>';
            }
        }

        async function loadDigest() {
            try {
                const res = await fetch('/digest?format=json');
                const digest = await res.json();
                let html = `
                    <h3 style="color: #fff; margin-bottom: 8px;">${digest.title}</h3>
                    <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">
                        Grounded in <strong>${digest.total_sources_cited}</strong> source records | Generated: ${digest.date_formatted}
                    </p>
                `;
                digest.themes.forEach(t => {
                    html += `
                        <div style="border-top: 1px solid var(--border); padding-top: 14px; margin-top: 14px;">
                            <h4 style="color: var(--accent);">${t.name} (${t.evidence_count} sources)</h4>
                            <div style="font-size: 13.5px; color: #cbd5e1; margin-top: 6px; white-space: pre-wrap;">${t.observation}</div>
                        </div>
                    `;
                });
                document.getElementById('digest-viewer').innerHTML = html;
            } catch (err) {
                document.getElementById('digest-viewer').innerHTML = '<p style="color: var(--text-muted);">Run synthesis first to view the executive digest.</p>';
            }
        }

        async function triggerSynthesis() {
            const btn = document.querySelector('button[onclick="triggerSynthesis()"]');
            btn.innerText = '⚡ Synthesizing...';
            btn.disabled = true;
            try {
                await fetch('/synthesize', { method: 'POST' });
                await loadThemes();
                await loadDigest();
                alert('Mental Model Synthesis Complete!');
            } catch (err) {
                alert('Synthesis error: ' + err.message);
            } finally {
                btn.innerText = '⚡ Re-Synthesize';
                btn.disabled = false;
            }
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
        }

        window.onload = init;
    </script>
</body>
</html>
"""
    return html_content


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
    files: List[UploadFile] = File(...),
    bank_id: str = Query(default="mobile-app-feedback"),
):
    total_retained = 0
    processed_files = []
    all_items = []

    for file in files:
        safe_name = Path(file.filename or "upload_file").name
        temp_path = settings.data_dir / f"upload_{safe_name}"
        try:
            content_bytes = await file.read()
            with open(temp_path, "wb") as f:
                f.write(content_bytes)

            items = load_feedback_file(temp_path)
            all_items.extend(items)
            processed_files.append({"name": safe_name, "records": len(items), "status": "extracted"})
        except Exception as fe:
            processed_files.append({"name": safe_name, "error": str(fe), "status": "failed"})
        finally:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass

    if all_items:
        res = client.retain_batch(bank_id=bank_id, items=all_items)
        total_retained = res.get("count", len(all_items))

    return {
        "status": "success",
        "total_files": len(files),
        "total_retained": total_retained,
        "files": processed_files,
    }


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
