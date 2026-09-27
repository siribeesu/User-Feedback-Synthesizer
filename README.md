# 🧠 User Feedback Synthesizer (Powered by Hindsight)

> A production-ready product intelligence tool that ingests raw, unstructured user feedback (app reviews, support tickets, survey text, NPS comments, Slack/Discord messages) and transforms it into living, evidence-backed insight using **[Hindsight](https://github.com/vectorize-io/hindsight)** as the agentic memory and reasoning backend.

---

## 🏛️ Architecture Overview

The system is built upon Hindsight's core biomimetic memory primitives: **Retain**, **Recall**, and **Reflect**.

```
  Raw Customer Feedback
(App Store, Play Store, Zendesk,
 Intercom, Discord, NPS Surveys)
              │
              ▼
   ┌──────────────────────┐
   │ Ingestion (retain)   │ ──► Tags: source, rating, user_id,
   │ importer.py / API    │     version, timestamp, segment
   └──────────┬───────────┘
              │
              ▼
   ┌────────────────────────────────────────────────────────┐
   │ Hindsight Memory Backend (:8888)                      │
   │ • Bank: "mobile-app-feedback"                          │
   │ • Mission: "Surface pain points strictly grounded"     │
   │ • Directives: "Never invent claims", "Cite sources"    │
   │ • Disposition: Skepticism (5/5), Agreeableness (1/5)   │
   └──────────┬───────────────────────────────┬─────────────┘
              │                               │
              ▼                               ▼
   ┌──────────────────────┐       ┌──────────────────────┐
   │ Synthesis (reflect)  │       │ Search (recall)      │
   │ synthesize.py        │       │ GET /search          │
   │ 4-5 Standing Models  │       │ Filters: date, source│
   │ • Onboarding         │       │          rating      │
   │ • Pricing complaints │       └──────────┬───────────┘
   │ • Export requests    │                  │
   │ • v2.3 Crash bugs    │                  │
   │ • Churn signals      │                  │
   └──────────┬───────────┘                  │
              │                              │
              ▼                              ▼
   ┌────────────────────────────────────────────────────────┐
   │ Output Surfaces                                        │
   │ 1. Interactive React Dashboard (:8000)                 │
   │ 2. Executive Weekly PM Digest (Markdown / HTML)        │
   │ 3. REST API (FastAPI / :8000)                          │
   └────────────────────────────────────────────────────────┘
```

### 1. Memory Banks (`config/banks.yaml`)
- **Product Isolation**: One bank per product/segment (e.g. `mobile-app-feedback`, `enterprise-tier-feedback`).
- **Mission**: *"I am a product feedback analyst for <product>. I surface recurring pain points, feature requests, and sentiment shifts, grounded strictly in submitted feedback."*
- **Directives**:
  - `strict_grounding`: Never invent a complaint that isn't backed by at least one retained memory.
  - `source_citation`: Always cite the number of sources per claim.
  - `preserve_contradictions`: Do not smooth over contradictions between users; highlight conflicting opinions explicitly.
- **Disposition**:
  - **Skepticism (5/5)**: High skepticism to strictly verify reported issues.
  - **Agreeableness (1/5)**: Low agreeableness to preserve raw friction points without sugarcoating.
  - **Literalism (4/5)**: High fidelity to verbatim user submissions.
  - **Empathy (1/5)**: Objective analytical reporting.

### 2. Ingestion Pipeline (`retain`)
- Ingests feedback items tagged with metadata: `source`, `timestamp`, `user_id`, `segment`, `rating`, `title`, and `app_version`.
- Batch imports CSV or JSON historical feedback (`importer.py`).
- Single feedback ingestion endpoint via `POST /ingest` or web UI form.

### 3. Synthesis Loop (`reflect` + Standing Mental Models)
- Maintained standing mental models per theme:
  1. `onboarding-friction`: *"What are users saying about onboarding, account creation, and initial sign-up friction?"*
  2. `pricing-complaints`: *"What are user complaints regarding pricing plans, subscription cost increases, and paywall limitations?"*
  3. `feature-requests-exports`: *"What feature requests do users have regarding data export, CSV/Excel/PDF formats, and external integrations?"*
  4. `release-v23-stability`: *"What issues, bugs, and performance regressions were reported after release v2.3?"*
  5. `churn-signals`: *"What are the primary churn signals, cancellation reasons, and user frustration triggers leading users to look for alternatives?"*
- **Temporal Sentiment Flips**: Detects shifts over time (e.g., checkout rated 5★ in v2.2, flipping to severe 1★ crash bugs in v2.3).
- Generates weekly PM digests in Markdown (`output/digest.md`) and HTML (`output/digest.html`).

### 4. Search (`recall`)
- Free-text semantic search wrapping `recall()` with metadata filters: `min_rating`, `max_rating`, `source_type`, `start_date`, `end_date`, and `limit`.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Docker & Docker Compose (optional for local self-hosting; built-in local memory engine enables immediate offline execution)

### 2. Setup Virtual Environment
```bash
# Activate virtual environment
.\.venv\Scripts\activate   # On Windows
# source .venv/bin/activate # On Linux/macOS

# Install dependencies (already installed in .venv)
pip install -r requirements.txt
```

### 3. Initialize Memory Bank & Directives
```bash
python setup_bank.py --bank-id mobile-app-feedback
```

### 4. Ingest Historical Feedback Dataset
Ingests 75 synthetic reviews and tickets spanning App Store, Google Play, Zendesk, Intercom, Discord, and NPS surveys:
```bash
python importer.py --file data/sample_feedback.csv --bank-id mobile-app-feedback
```

### 5. Run Mental Model Synthesis & Generate Digest
```bash
python synthesize.py --bank-id mobile-app-feedback
```
Artifacts generated:
- `output/digest.md`: Formatted Markdown report.
- `output/digest.html`: Beautiful executive HTML report ready for emailing to product leadership.
- `output/digest.json`: Structured JSON for BI/analytics integration.

### 6. Launch the Application (React Frontend + API)
```bash
.\.venv\Scripts\uvicorn src.api:app --reload --port 8000
```
Open **`http://localhost:8000`** in your browser to explore:
- **Interactive React Dashboard**: Theme cards, evidence citations, observation drilldown, verbatim customer quotes with attribution.
- **Search Feedback (Recall)**: Ad-hoc search with channel and rating filters.
- **Ingestion Pipeline**: Submit single feedback or trigger batch ingestion.
- **Weekly PM Digest**: Live executive report preview and `.md` / `.html` downloads.
- **Interactive API Docs**: Swagger UI available at **`http://localhost:8000/docs`**.

*(Optional) React Frontend Development Mode:*
```bash
cd frontend
npm run dev # Runs Vite dev server at http://localhost:5173
```

---

## 🐳 Running Hindsight with Docker Compose

To run the official Hindsight server locally:

1. Configure your LLM key in `.env`:
   ```env
   HINDSIGHT_API_LLM_PROVIDER=openai
   HINDSIGHT_API_LLM_API_KEY=sk-your-openai-or-groq-key
   HINDSIGHT_API_LLM_MODEL=gpt-4o-mini
   ```
2. Start the Docker container:
   ```bash
   docker compose up -d
   ```
   - **Hindsight API**: `http://localhost:8888`
   - **Hindsight Control Plane UI**: `http://localhost:9999`
3. The client automatically detects the live Hindsight server on `http://localhost:8888` and seamlessly routes all memory operations (`retain`, `recall`, `reflect`) through the official `hindsight-client` SDK!

---

## 🧪 Running Tests

The test suite validates bank configuration, retention, recall filtering, strict reflect grounding, temporal shift detection, and FastAPI endpoints:

```bash
.\.venv\Scripts\pytest -v tests/test_synthesizer.py
```

Result: `8 passed in 5.32s`

---

## 📂 Project Structure

```
User Feedback Synthesizer/
├── docker-compose.yml          # Hindsight service (:8888 API, :9999 UI)
├── .env.example                # Environment variables template
├── .env                        # Active environment configuration
├── config/
│   └── banks.yaml              # Declarative memory bank & mental model configuration
├── data/
│   ├── generate_sample_data.py # Script generating 75 realistic feedback records
│   ├── sample_feedback.csv     # Historical feedback dataset (CSV)
│   ├── sample_feedback.json    # Historical feedback dataset (JSON)
│   └── hindsight_local_bank.json # Persistent memory storage
├── output/
│   ├── digest.md               # Auto-generated weekly PM digest (Markdown)
│   ├── digest.html             # Executive HTML report
│   └── digest.json             # Structured synthesis results
├── src/
│   ├── __init__.py
│   ├── config.py               # Pydantic configuration loader
│   ├── client.py               # Hindsight client wrapper (Live + Local engine)
├── frontend/                   # React frontend (Vite + Lucide)
│   ├── src/                    # React components (App.jsx, App.css)
│   └── dist/                   # Production React build served by FastAPI
├── setup_bank.py               # Bank & directive setup CLI
├── importer.py                 # Feedback ingestion pipeline CLI
├── synthesize.py               # Synthesis loop & digest generator CLI
└── tests/
    └── test_synthesizer.py     # End-to-end test suite
```
