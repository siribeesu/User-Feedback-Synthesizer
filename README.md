<div align="center">

# 🧠 Fedar
### **AI-Powered Customer Intelligence & Persistent Memory Platform**

*Turn multi-channel customer feedback into living, persistent product intelligence using **Hindsight Agentic Memory** and **Hugging Face Pretrained Models**.*

[![Python](https://img.shields.io/badge/Python-3.13-black?style=for-the-badge&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-black?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-black?style=for-the-badge&logo=react)](https://react.dev)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-Transformers-black?style=for-the-badge&logo=huggingface)](https://huggingface.co)
[![Hindsight](https://img.shields.io/badge/Memory-Hindsight%20Engine-black?style=for-the-badge)](https://github.com/vectorize-io/hindsight)
[![Tests](https://img.shields.io/badge/Pytest-19%2F19%20Passing-black?style=for-the-badge)](https://docs.pytest.org)

</div>

---

## 📖 Table of Contents
- [Executive Overview](#-executive-overview)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Hugging Face AI Pipeline](#-hugging-face-ai-pipeline)
- [Hindsight Memory Primitives](#-hindsight-memory-primitives)
- [Interactive UI Walkthrough](#-interactive-ui-walkthrough)
- [API Reference](#-api-reference)
- [Quick Start Guide](#-quick-start-guide)
- [Testing & Verification](#-testing--verification)

---

## 🎯 Executive Overview

Product and engineering teams receive thousands of unstructured customer reviews, support tickets, chat transcripts, and survey comments across fragmented channels.

Traditional analytics dashboards only present **static metrics** and vanity charts. Meanwhile, standard LLM wrappers **forget historical context** across releases and hallucinate unsupported insights.

**Fedar** solves this by maintaining a **living, persistent memory bank**:
1. **Multi-Channel Ingestion**: Streams feedback from App Store, Google Play, Zendesk, Intercom, Discord, and In-App SDKs.
2. **AI Semantic Understanding**: Classifies sentiment, emotion, and topics using Hugging Face transformer models.
3. **Continuous Reflection (`reflect`)**: Maintains standing mental models that learn incrementally without re-indexing.
4. **Temporal Sentiment Shift Detection**: Pinpoints exact release versions where customer satisfaction flipped (e.g. v2.2 to v2.3 regressions).
5. **Zero-Hallucination Grounding**: Every insight and PM digest is strictly backed by verbatim user evidence records.

---

## 🏛️ System Architecture

```
  Multi-Channel Feedback Streams
 (App Store, Google Play, Zendesk,
  Intercom, Discord, In-App SDK, CSV)
                 │
                 ▼
     ┌───────────────────────┐
     │ Ingestion & Webhooks  │ ──► Metadata: source, rating, user_name,
     │    POST /ingest       │     version, timestamp, segment
     └───────────┬───────────┘
                 │
                 ▼
     ┌────────────────────────────────────────────────────────┐
     │ Hugging Face AI Pipeline                               │
     │ • Sentiment: cardiffnlp/twitter-roberta-base-sentiment │
     │ • Emotion:   j-hartmann/emotion-english-distilroberta  │
     │ • Vectors:   sentence-transformers/all-MiniLM-L6-v2    │
     └───────────┬────────────────────────────────────────────┘
                 │
                 ▼
     ┌────────────────────────────────────────────────────────┐
     │ Hindsight Agentic Memory Engine (:8888 / Local Bank)   │
     │ • Memory Bank: "mobile-app-feedback"                   │
     │ • Directives:  Strict Grounding & Verbatim Citations   │
     │ • Disposition: Skepticism (5/5), Agreeableness (1/5)   │
     └───────────┬────────────────────────────┬───────────────┘
                 │                            │
                 ▼                            ▼
     ┌───────────────────────┐    ┌───────────────────────┐
     │ Reflection (reflect)  │    │ Search (recall)       │
     │ Continuous Synthesis  │    │ Multi-field Semantic  │
     │ • Onboarding Friction │    │ Filters: Date, Rating,│
     │ • v2.3 Bug Regression │    │ Source, Version       │
     │ • Feature Demands     │    └───────────┬───────────┘
     └───────────┬───────────┘                │
                 │                            │
                 ▼                            ▼
     ┌────────────────────────────────────────────────────────┐
     │ Output & User Surfaces                                 │
     │ 1. Executive React Dashboard (Full Viewport Monochrome)│
     │ 2. Data Connectors Hub & Bulk Importer                 │
     │ 3. Temporal Shift & Release Impact Analytics           │
     │ 4. AI Product Decision Copilot                         │
     │ 5. Resolution & Outcome Memory Tracker (Kanban)        │
     │ 6. Automated Weekly Executive PM Digests (HTML / JSON) │
     └────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 1. 📊 Executive Dashboard & Voice of Customer Signals
- **Real-Time KPIs**: Total ingested volume, Negative Sentiment Rate, Active Standing Models, and Temporal Shift alerts.
- **Sentiment Progression Trend**: 30-day interactive time-series tracking Net Sentiment Score (NSS).
- **Multi-Channel Distribution**: Visual breakdown across App Store, Google Play, Zendesk, Intercom, Discord, and NPS.

### 2. 🔌 Data Connectors & Ingestion Architecture
- **Active Application Pipelines**: Live management cards for Apple App Store Connect, Google Play Console, Zendesk, Intercom, and Discord.
- **Connector Setup Wizard**: Link and authorize new external platforms in seconds.
- **Bulk Dataset Importer**: Drag-and-drop CSV / JSON file importer with 1-click sample data loaders.
- **Production Webhooks & SDKs**: Production endpoint `https://api.fedar.ai/ingest` with integration snippets for **cURL**, **JavaScript / React**, **Python**, and **Swift / iOS**.

### 3. 🔍 Feedback Explorer with Multi-Field Semantic Filters
- Real-time client & server filtering across **Text Query**, **Ingestion Channel**, **Star Rating (1–5★)**, **Sentiment**, and **App Version**.
- Expandable feedback cards showing verified user tiers, release tags, and timestamps with instant filter reset.

### 4. 🧠 Themes & Grounded Evidence Modal
- Standing mental models synthesizing observations directly from retained memory facts.
- **Strict Evidence Drilldown**: Formatted modal presenting PM narratives, key metrics, and verbatim user citations with star ratings.
- **Temporal Shift Detection**: Automatic alerts when sentiment drops between software versions.

### 5. 🚀 Release Version Impact Analysis
- Direct side-by-side comparison between baseline and current releases (e.g. `v2.2 vs v2.3`).
- Tracks average rating changes, negative sentiment spikes, and crash remarks across updates.

### 6. 🎯 Feature Demand & Opportunity Radar
- Clusters raw feature requests into prioritized opportunities ranked by **distinct user volume** and **enterprise tier priority**.
- Identifies high-impact opportunities like scheduled CSV exports, offline sync, and granular RBAC permissions.

### 7. ⏳ Memory Timeline Evolution
- Visual milestone timeline documenting how the AI's understanding evolves across successive ingestions (`CREATED`, `UPDATED`, `SHIFTED`).

### 8. 🤖 Grounded AI Product Copilot
- Natural language interface for PMs to ask strategic questions.
- Every response is strictly grounded with clickable source evidence citations.

### 9. 📋 Resolution & Outcome Memory Tracker
- Kanban workflow (`Detected` ➔ `Investigating` ➔ `In Progress` ➔ `Resolved` ➔ `Verified`) tracking product fixes from initial detection to post-release sentiment recovery.

### 10. 📄 Executive Weekly PM Digests
- Generates polished weekly synthesis reports in Markdown, JSON, and downloadable styled HTML format.

---

## 🤗 Hugging Face AI Pipeline

Fedar integrates state-of-the-art pretrained models from the Hugging Face hub with in-memory caching and fallback execution:

| Task | Model | Purpose |
| :--- | :--- | :--- |
| **Sentiment Analysis** | `cardiffnlp/twitter-roberta-base-sentiment-latest` | 3-class sentiment scoring (Positive, Neutral, Negative) |
| **Emotion Detection** | `j-hartmann/emotion-english-distilroberta-base` | Fine-grained emotion classification (Anger, Frustration, Joy, Sadness, Neutral) |
| **Semantic Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` | Dense vector representations for memory recall & similarity search |

---

## 🧠 Hindsight Memory Primitives

Fedar leverages Hindsight's biomimetic memory primitives:

* **`retain()`**: Ingests feedback items as durable episodic memories with structured metadata (`source`, `user_name`, `rating`, `app_version`, `segment`).
* **`recall()`**: Recalls relevant memories using vector embeddings and metadata filters.
* **`reflect()`**: Synthesizes standing mental models to reason over feedback over time without full dataset re-indexing.

---

## 💻 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health, model status, and memory backend check |
| `GET` | `/search` | Multi-field semantic memory recall with filters |
| `POST` | `/ingest` | Real-time single feedback ingestion endpoint |
| `POST` | `/ingest/batch` | Bulk CSV / JSON feedback dataset upload |
| `GET` | `/themes` | List standing mental models and synthesized insights |
| `GET` | `/themes/{id}` | Theme detail with grounded evidence citations |
| `POST` | `/synthesize` | Trigger on-demand Hindsight `reflect()` across standing models |
| `GET` | `/analytics/dashboard` | Aggregated executive KPIs and sentiment metrics |
| `GET` | `/analytics/sentiment-trend` | 30-day sentiment progression trend |
| `GET` | `/analytics/release-impact` | Version-by-version release impact analytics |
| `GET` | `/analytics/feature-opportunities` | Clustered feature demand opportunities |
| `GET` | `/memory/timeline/{id}` | Chronological theme evolution milestones |
| `GET` | `/memory/inspect` | Raw memory inspection and entity vectors |
| `POST` | `/copilot/ask` | AI Copilot conversational question answering |
| `GET/POST`| `/resolutions` | Resolution lifecycle tracker CRUD |
| `GET` | `/digest` | Generate executive weekly PM digest (JSON / HTML) |
| `GET` | `/analytics/model-health` | Hugging Face model status and fallback health |

---

## ⚡ Quick Start Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/siribeesu/User-Feedback-Synthesizer.git
cd User-Feedback-Synthesizer

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate   # On Windows
# source .venv/bin/activate # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Start FastAPI Backend
uvicorn src.api:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite Development Server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🧪 Testing & Verification

Run the comprehensive pytest suite:
```bash
pytest -v tests/test_synthesizer.py
```
```
======================= 19 passed in 5.80s =======================
```

Build the React frontend production bundle:
```bash
cd frontend
npm run build
```
```
✓ 2459 modules transformed.
✓ built in 542ms
```

---

<div align="center">
Built with ❤️ for modern Product Teams & AI Engineers.
</div>
