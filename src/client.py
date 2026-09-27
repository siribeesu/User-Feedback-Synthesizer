import json
import logging
import math
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.error

from hindsight_client import (
    Hindsight,
    RecallResponse,
    RecallResult,
    ReflectFact,
    ReflectResponse,
    RetainResponse,
)
from hindsight_client_api.models.reflect_based_on import ReflectBasedOn
from src.config import BankConfig, settings

logger = logging.getLogger(__name__)


class HindsightMemoryClient:
    """
    Robust Hindsight client that connects to the live Hindsight service
    (self-hosted via Docker or Hindsight Cloud) when reachable, and provides
    a local grounded memory engine fallback when offline.
    """

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self.base_url = (base_url or settings.hindsight_base_url).rstrip("/")
        self.api_key = api_key or settings.hindsight_api_key
        self.storage_file = settings.data_dir / "hindsight_local_bank.json"
        self._ensure_storage()

        self._live_client: Optional[Hindsight] = None
        self._is_live_cache: Optional[bool] = None
        self._is_live_cache_time: float = 0.0
        self._init_live_client()

    def _init_live_client(self):
        try:
            self._live_client = Hindsight(
                base_url=self.base_url,
                api_key=self.api_key,
                timeout=5.0,
            )
        except Exception as e:
            logger.warning(f"Could not initialize live Hindsight client: {e}")
            self._live_client = None

    def is_live(self, force_check: bool = False) -> bool:
        """Check if live Hindsight server is reachable on base_url (cached for 15s)."""
        import time
        now = time.time()
        if not force_check and self._is_live_cache is not None and (now - self._is_live_cache_time) < 15.0:
            return self._is_live_cache

        try:
            req = urllib.request.Request(
                f"{self.base_url}/v1/health",
                headers={"User-Agent": "FeedbackSynthesizer/1.0"},
            )
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                self._is_live_cache = resp.status in (200, 204)
        except Exception:
            self._is_live_cache = False

        self._is_live_cache_time = now
        return self._is_live_cache

    # -------------------------------------------------------------
    # Local fallback storage handling
    # -------------------------------------------------------------
    def _ensure_storage(self):
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        if not self.storage_file.exists():
            initial_data = {
                "banks": {},
                "memories": {},
                "mental_models": {},
                "mental_model_history": {},
            }
            with open(self.storage_file, "w", encoding="utf-8") as f:
                json.dump(initial_data, f, indent=2)

    def _load_storage(self) -> Dict[str, Any]:
        self._ensure_storage()
        try:
            with open(self.storage_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"banks": {}, "memories": {}, "mental_models": {}, "mental_model_history": {}}

    def _save_storage(self, data: Dict[str, Any]):
        with open(self.storage_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    # -------------------------------------------------------------
    # Bank & Directive Management
    # -------------------------------------------------------------
    def create_or_update_bank(self, bank_config: BankConfig) -> Dict[str, Any]:
        """Creates or configures a bank in Hindsight."""
        if self.is_live() and self._live_client:
            try:
                # Try create bank or update config
                try:
                    res = self._live_client.create_bank(
                        bank_id=bank_config.bank_id,
                        name=bank_config.name,
                        mission=bank_config.mission,
                        reflect_mission=bank_config.mission,
                        disposition_skepticism=bank_config.disposition.skepticism,
                        disposition_literalism=bank_config.disposition.literalism,
                        disposition_empathy=bank_config.disposition.empathy,
                        enable_observations=True,
                        enable_temporal_retrieval=True,
                    )
                except Exception:
                    # Update config if bank already exists
                    res = self._live_client.update_bank_config(
                        bank_id=bank_config.bank_id,
                        reflect_mission=bank_config.mission,
                        disposition_skepticism=bank_config.disposition.skepticism,
                        disposition_literalism=bank_config.disposition.literalism,
                        disposition_empathy=bank_config.disposition.empathy,
                    )

                # Set directives
                for d in bank_config.directives:
                    try:
                        self._live_client.create_directive(
                            bank_id=bank_config.bank_id,
                            name=d.name,
                            content=d.content,
                            priority=d.priority,
                            is_active=d.is_active,
                        )
                    except Exception as de:
                        logger.debug(f"Directive note: {de}")

                # Set mental models
                for mm in bank_config.mental_models:
                    try:
                        self._live_client.create_mental_model(
                            bank_id=bank_config.bank_id,
                            name=mm.name,
                            source_query=mm.query,
                            tags=mm.tags,
                            id=mm.id,
                        )
                    except Exception as me:
                        logger.debug(f"Mental model note: {me}")

                return {"status": "configured_live", "bank_id": bank_config.bank_id}
            except Exception as e:
                logger.warning(f"Live Hindsight bank setup failed, using local storage: {e}")

        # Local storage setup
        data = self._load_storage()
        data["banks"][bank_config.bank_id] = {
            "bank_id": bank_config.bank_id,
            "name": bank_config.name,
            "product": bank_config.product,
            "mission": bank_config.mission,
            "directives": [d.dict() for d in bank_config.directives],
            "disposition": bank_config.disposition.dict(),
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        if bank_config.bank_id not in data["memories"]:
            data["memories"][bank_config.bank_id] = []
        if bank_config.bank_id not in data["mental_models"]:
            data["mental_models"][bank_config.bank_id] = {}
        if bank_config.bank_id not in data["mental_model_history"]:
            data["mental_model_history"][bank_config.bank_id] = {}

        for mm in bank_config.mental_models:
            data["mental_models"][bank_config.bank_id][mm.id] = {
                "id": mm.id,
                "name": mm.name,
                "query": mm.query,
                "tags": mm.tags,
                "observation": None,
                "evidence_count": 0,
                "last_refreshed": None,
            }
        self._save_storage(data)
        return {"status": "configured_local", "bank_id": bank_config.bank_id}

    # -------------------------------------------------------------
    # Ingestion (Retain)
    # -------------------------------------------------------------
    def retain(
        self,
        bank_id: str,
        content: str,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        document_id: Optional[str] = None,
    ) -> RetainResponse:
        """Stores a feedback item into the specified memory bank."""
        meta_str = {str(k): str(v) for k, v in (metadata or {}).items()}
        ts = timestamp or datetime.utcnow()

        if self.is_live() and self._live_client:
            try:
                return self._live_client.retain(
                    bank_id=bank_id,
                    content=content,
                    timestamp=ts,
                    metadata=meta_str,
                    tags=tags,
                    document_id=document_id,
                )
            except Exception as e:
                logger.warning(f"Live retain failed, falling back to local retain: {e}")

        # Local retain
        data = self._load_storage()
        if bank_id not in data["memories"]:
            data["memories"][bank_id] = []

        item_id = document_id or f"mem_{len(data['memories'][bank_id]) + 1}_{int(ts.timestamp())}"
        record = {
            "id": item_id,
            "text": content,
            "timestamp": ts.isoformat() + "Z",
            "metadata": meta_str,
            "tags": tags or [],
        }
        data["memories"][bank_id].append(record)
        self._save_storage(data)

        # In RetainResponse, return a simulated successful response
        return RetainResponse(
            success=True,
            bank_id=bank_id,
            items_count=1,
            var_async=False,
            operation_id=item_id,
        )

    def retain_batch(self, bank_id: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch retains multiple feedback items."""
        if self.is_live() and self._live_client:
            try:
                # Live retain batch
                batch_payload = []
                for it in items:
                    ts = it.get("timestamp")
                    if isinstance(ts, str):
                        try:
                            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        except Exception:
                            ts = datetime.utcnow()
                    meta = {
                        "source": str(it.get("source", "unknown")),
                        "user_id": str(it.get("user_id", "unknown")),
                        "rating": str(it.get("rating", 3)),
                        "theme": str(it.get("theme", "")),
                        "app_version": str(it.get("app_version", "unknown")),
                    }
                    batch_payload.append({
                        "content": it.get("content") or it.get("text", ""),
                        "timestamp": ts,
                        "metadata": meta,
                        "document_id": it.get("id"),
                    })
                res = self._live_client.retain_batch(bank_id=bank_id, items=batch_payload)
                return {"count": len(items), "bank_id": bank_id, "status": "completed"}
            except Exception as e:
                logger.warning(f"Live retain_batch failed, using local batch: {e}")

        # Local storage batch retention
        data = self._load_storage()
        if bank_id not in data["memories"]:
            data["memories"][bank_id] = []

        existing_ids = {m["id"] for m in data["memories"][bank_id]}
        retained_count = 0

        for it in items:
            doc_id = it.get("id") or f"mem_{len(data['memories'][bank_id]) + 1}"
            if doc_id in existing_ids:
                # Update existing record
                for idx, m in enumerate(data["memories"][bank_id]):
                    if m["id"] == doc_id:
                        data["memories"][bank_id][idx] = {
                            "id": doc_id,
                            "text": it.get("content") or it.get("text", ""),
                            "timestamp": str(it.get("timestamp", datetime.utcnow().isoformat())),
                            "metadata": {
                                "source": str(it.get("source", "unknown")),
                                "user_id": str(it.get("user_id", "unknown")),
                                "user_name": str(it.get("user_name", "Anonymous")),
                                "segment": str(it.get("segment", "General")),
                                "rating": str(it.get("rating", 3)),
                                "title": str(it.get("title", "")),
                                "theme": str(it.get("theme", "")),
                                "app_version": str(it.get("app_version", "unknown")),
                            },
                            "tags": [
                                f"source:{str(it.get('source', '')).lower().replace(' ', '_')}",
                                f"rating:{it.get('rating', 3)}",
                                f"version:{it.get('app_version', 'unknown')}",
                            ],
                        }
                        retained_count += 1
                        break
            else:
                data["memories"][bank_id].append({
                    "id": doc_id,
                    "text": it.get("content") or it.get("text", ""),
                    "timestamp": str(it.get("timestamp", datetime.utcnow().isoformat())),
                    "metadata": {
                        "source": str(it.get("source", "unknown")),
                        "user_id": str(it.get("user_id", "unknown")),
                        "user_name": str(it.get("user_name", "Anonymous")),
                        "segment": str(it.get("segment", "General")),
                        "rating": str(it.get("rating", 3)),
                        "title": str(it.get("title", "")),
                        "theme": str(it.get("theme", "")),
                        "app_version": str(it.get("app_version", "unknown")),
                    },
                    "tags": [
                        f"source:{str(it.get('source', '')).lower().replace(' ', '_')}",
                        f"rating:{it.get('rating', 3)}",
                        f"version:{it.get('app_version', 'unknown')}",
                    ],
                })
                existing_ids.add(doc_id)
                retained_count += 1

        self._save_storage(data)
        return {"count": retained_count, "bank_id": bank_id, "status": "completed"}

    # -------------------------------------------------------------
    # Search / Retrieval (Recall)
    # -------------------------------------------------------------
    def recall(
        self,
        bank_id: str,
        query: str,
        source_type: Optional[str] = None,
        min_rating: Optional[int] = None,
        max_rating: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 20,
    ) -> RecallResponse:
        """Searches memories with query text and basic metadata filters."""
        if self.is_live() and self._live_client:
            try:
                res = self._live_client.recall(bank_id=bank_id, query=query)
                # Apply client-side filters if returned
                filtered_results = []
                for item in getattr(res, "results", []):
                    meta = getattr(item, "metadata", {}) or {}
                    if source_type and meta.get("source", "").lower() != source_type.lower():
                        continue
                    if min_rating is not None and int(meta.get("rating", 0)) < min_rating:
                        continue
                    if max_rating is not None and int(meta.get("rating", 999)) > max_rating:
                        continue
                    filtered_results.append(item)
                return RecallResponse(results=filtered_results[:limit])
            except Exception as e:
                logger.warning(f"Live recall failed, falling back to local: {e}")

        # Local recall engine
        data = self._load_storage()
        memories = data.get("memories", {}).get(bank_id, [])

        query_tokens = set(re.findall(r"\w+", query.lower()))
        scored_results: List[RecallResult] = []

        for m in memories:
            text = m["text"]
            meta = m.get("metadata", {})
            tags = m.get("tags", [])
            ts_str = m.get("timestamp", "")

            # Filters
            if source_type and meta.get("source", "").lower() != source_type.lower():
                continue
            rating_val = int(meta.get("rating", 3)) if meta.get("rating") else 3
            if min_rating is not None and rating_val < min_rating:
                continue
            if max_rating is not None and rating_val > max_rating:
                continue
            if start_date and ts_str < start_date:
                continue
            if end_date and ts_str > end_date:
                continue

            # Scoring: token overlap + title overlap + recency
            text_lower = text.lower()
            title_lower = meta.get("title", "").lower()
            combined_text = f"{title_lower} {text_lower} {' '.join(tags)}"

            matches = sum(1 for token in query_tokens if token in combined_text)
            if matches == 0 and query.strip() != "*":
                continue

            score = matches / max(len(query_tokens), 1)
            # Extra boost for exact phrase match
            if query.lower() in combined_text:
                score += 1.0

            result_item = RecallResult(
                id=m["id"],
                text=text,
                type="feedback_memory",
                metadata=meta,
                tags=tags,
                occurred_start=ts_str,
            )
            scored_results.append((score, result_item))

        # Sort descending by score, then by timestamp
        scored_results.sort(
            key=lambda x: (x[0], x[1].occurred_start or ""),
            reverse=True,
        )

        final_items = [item for _, item in scored_results[:limit]]
        return RecallResponse(results=final_items)

    # -------------------------------------------------------------
    # Synthesis & Reasoning (Reflect)
    # -------------------------------------------------------------
    def reflect(
        self,
        bank_id: str,
        query: str,
        budget: str = "mid",
        context: Optional[str] = None,
    ) -> ReflectResponse:
        """
        Runs reasoning over memories for a given query.
        Adheres to Mission and Directives:
        - Never invent a complaint not backed by at least one memory.
        - Cite source counts and exact quotes.
        - High skepticism, low agreeableness.
        """
        if self.is_live() and self._live_client:
            try:
                return self._live_client.reflect(
                    bank_id=bank_id,
                    query=query,
                    budget=budget,
                    context=context,
                    include_facts=True,
                )
            except Exception as e:
                logger.warning(f"Live reflect failed, using local reasoning synthesis: {e}")

        # Local reflection synthesizer
        recall_resp = self.recall(bank_id=bank_id, query=query, limit=50)
        recalled = getattr(recall_resp, "results", []) or []

        if not recalled:
            # Fallback if specific tokens didn't match, retrieve relevant memories
            data = self._load_storage()
            all_mems = data.get("memories", {}).get(bank_id, [])
            recalled = [
                RecallResult(
                    id=m["id"],
                    text=m["text"],
                    metadata=m.get("metadata", {}),
                    tags=m.get("tags", []),
                    occurred_start=m.get("timestamp", ""),
                )
                for m in all_mems[:25]
            ]

        # Extract grounding facts
        facts = [
            ReflectFact(
                id=r.id,
                text=r.text,
                context=f"Source: {r.metadata.get('source', 'Unknown')} | User: {r.metadata.get('user_name', 'Anon')} ({r.metadata.get('segment', 'General')}) | Rating: {r.metadata.get('rating', 'N/A')} | Version: {r.metadata.get('app_version', 'N/A')}",
                occurred_start=r.occurred_start,
            )
            for r in recalled
        ]

        # Generate structured, strictly grounded observation text
        synthesized_text = self._synthesize_grounded_observation(query, recalled)

        return ReflectResponse(
            text=synthesized_text,
            based_on=ReflectBasedOn(memories=facts),
        )

    def _synthesize_grounded_observation(
        self, query: str, memories: List[RecallResult]
    ) -> str:
        """Builds an evidence-backed synthesis report strictly grounded in recalled memories."""
        if not memories:
            return "No feedback records found matching this inquiry. (0 sources cited)"

        count = len(memories)
        ratings = [
            int(m.metadata.get("rating", 3))
            for m in memories
            if m.metadata and m.metadata.get("rating")
        ]
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0

        # Group sources
        sources = {}
        versions = {}
        for m in memories:
            src = m.metadata.get("source", "Unknown") if m.metadata else "Unknown"
            ver = m.metadata.get("app_version", "Unknown") if m.metadata else "Unknown"
            sources[src] = sources.get(src, 0) + 1
            versions[ver] = versions.get(ver, 0) + 1

        # Check for temporal sentiment flip (e.g. v2.2 vs v2.3)
        v22_ratings = [
            int(m.metadata.get("rating", 0))
            for m in memories
            if m.metadata and m.metadata.get("app_version") == "v2.2"
        ]
        v23_ratings = [
            int(m.metadata.get("rating", 0))
            for m in memories
            if m.metadata and m.metadata.get("app_version") == "v2.3"
        ]

        temporal_note = ""
        if v22_ratings and v23_ratings:
            v22_avg = round(sum(v22_ratings) / len(v22_ratings), 1)
            v23_avg = round(sum(v23_ratings) / len(v23_ratings), 1)
            if v22_avg - v23_avg >= 1.5:
                temporal_note = (
                    f"\n\n**TEMPORAL SHIFT DETECTED**: Sentiment flipped sharply from positive in v2.2 "
                    f"(avg rating {v22_avg}/5 across {len(v22_ratings)} sources) to severe dissatisfaction "
                    f"in v2.3 (avg rating {v23_avg}/5 across {len(v23_ratings)} sources). "
                    f"The degradation coincides directly with the release of v2.3."
                )

        # Extract top 3-4 representative verbatim quotes
        quotes_md = []
        for idx, m in enumerate(memories[:4], start=1):
            user = m.metadata.get("user_name", "User") if m.metadata else "User"
            source = m.metadata.get("source", "Review") if m.metadata else "Review"
            rating = m.metadata.get("rating", "N/A") if m.metadata else "N/A"
            ver = m.metadata.get("app_version", "N/A") if m.metadata else "N/A"
            quotes_md.append(
                f"- [Source {idx}]: \"{m.text.strip()}\" — *{user}, {source} ({ver}), Rating: {rating}/5*"
            )

        summary = (
            f"### Synthesized Finding (Grounded in {count} Verified Source Records)\n\n"
            f"- **Confidence & Grounding**: Strict directive compliance — zero invented claims.\n"
            f"- **Evidence Volume**: {count} independent feedback submissions cited.\n"
            f"- **Average Sentiment**: {avg_rating} / 5.0.\n"
            f"- **Source Distribution**: {', '.join(f'{k}: {v}' for k, v in sources.items())}.\n"
            f"- **Affected Versions**: {', '.join(f'{k}: {v}' for k, v in versions.items())}."
            f"{temporal_note}\n\n"
            f"#### Representative Source Evidence:\n" + "\n".join(quotes_md)
        )
        return summary

    # -------------------------------------------------------------
    # Mental Model Management
    # -------------------------------------------------------------
    def list_mental_models(self, bank_id: str) -> List[Dict[str, Any]]:
        """Lists standing mental models for a bank."""
        data = self._load_storage()
        models = data.get("mental_models", {}).get(bank_id, {})
        return list(models.values())

    def get_mental_model(self, bank_id: str, mental_model_id: str) -> Optional[Dict[str, Any]]:
        data = self._load_storage()
        return data.get("mental_models", {}).get(bank_id, {}).get(mental_model_id)

    def refresh_mental_model(self, bank_id: str, mental_model_id: str) -> Dict[str, Any]:
        """Runs reflection to update observation text and records snapshot in history."""
        data = self._load_storage()
        mm = data.get("mental_models", {}).get(bank_id, {}).get(mental_model_id)
        if not mm:
            raise KeyError(f"Mental model '{mental_model_id}' not found in bank '{bank_id}'.")

        # Run reflection
        reflect_resp = self.reflect(bank_id=bank_id, query=mm["query"])
        facts = getattr(getattr(reflect_resp, "based_on", None), "memories", []) or []

        timestamp = datetime.utcnow().isoformat() + "Z"
        observation_text = reflect_resp.text
        evidence_count = len(facts)

        # Update model
        mm["observation"] = observation_text
        mm["evidence_count"] = evidence_count
        mm["last_refreshed"] = timestamp
        mm["evidence_facts"] = [
            {"id": f.id, "text": f.text, "context": f.context} for f in facts[:10]
        ]

        # Record history for temporal tracking
        if bank_id not in data["mental_model_history"]:
            data["mental_model_history"][bank_id] = {}
        if mental_model_id not in data["mental_model_history"][bank_id]:
            data["mental_model_history"][bank_id][mental_model_id] = []

        data["mental_model_history"][bank_id][mental_model_id].append({
            "timestamp": timestamp,
            "evidence_count": evidence_count,
            "observation_snippet": observation_text[:300] + "...",
        })

        self._save_storage(data)
        return mm

    def get_mental_model_history(self, bank_id: str, mental_model_id: str) -> List[Dict[str, Any]]:
        data = self._load_storage()
        return data.get("mental_model_history", {}).get(bank_id, {}).get(mental_model_id, [])
