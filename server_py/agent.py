"""Local article search pipeline with optional Gemini reranking."""
from __future__ import annotations

import logging
import json
import os
import re
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Any, Callable

import google.generativeai as genai

from .schemas import AgentState, Article
from .storage import storage

logger = logging.getLogger(__name__)

MAX_STEPS = 10
TOOL_ALLOWLIST: frozenset[str] = frozenset({"json_store_search"})
run_logs: list[dict[str, Any]] = []
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
RERANK_CANDIDATE_LIMIT = 8
MODEL_CONTENT_PREVIEW_CHARS = 1400

_gemini_api_key = os.getenv("GEMINI_API_KEY")


def _resolve_gemini_model(configured_model: str) -> str:
    """Pick a valid Gemini model for generateContent in the current API/account."""
    try:
        available = []
        for model in genai.list_models():
            methods = set(getattr(model, "supported_generation_methods", []) or [])
            name = str(getattr(model, "name", ""))
            # Filter for models that support generateContent and are in the 'models/gemini' namespace
            if name.startswith("models/gemini") and "generateContent" in methods:
                available.append(name.replace("models/", ""))

        if not available:
            return configured_model

        # If configured model is in the list, use it
        if configured_model in available:
            return configured_model

        # Prefer stable/standard models over 'latest' or 'preview' if possible
        preferred = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-3-flash-preview"]
        for p in preferred:
            if p in available:
                return p

        return available[0]
    except Exception:
        return configured_model


RESOLVED_GEMINI_MODEL = GEMINI_MODEL
if _gemini_api_key:
    genai.configure(api_key=_gemini_api_key)
    RESOLVED_GEMINI_MODEL = _resolve_gemini_model(GEMINI_MODEL)
    if RESOLVED_GEMINI_MODEL != GEMINI_MODEL:
        logger.warning(
            "Configured GEMINI_MODEL '%s' not available; using '%s' instead",
            GEMINI_MODEL,
            RESOLVED_GEMINI_MODEL,
        )


def _append_run_log(entry: dict[str, Any]) -> None:
    run_logs.append({**entry, "timestamp": datetime.now(timezone.utc).isoformat()})


class StateMachine:
    """Tracks agent execution states and transitions."""

    def __init__(self) -> None:
        self.current: str = AgentState.IDLE.value
        self.transitions: list[dict[str, str]] = []

    def transition(self, event: str, next_state: AgentState) -> dict[str, str]:
        transition = {
            "from": self.current,
            "event": event,
            "to": next_state.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.transitions.append(transition)
        self.current = next_state.value
        return transition


def _sanitize_query(query: str) -> str:
    """Normalize untrusted input before using it in local search."""
    sanitized = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", query)
    sanitized = re.sub(r"\s{3,}", "  ", sanitized)
    return sanitized[:500].strip()


def _normalize_term(term: str) -> str:
    """Lightweight stemming for keyword matching."""
    normalized = term.lower().strip()
    for suffix in ("ingly", "edly", "ness", "ment", "ing", "ed", "ly", "es", "s"):
        if len(normalized) > len(suffix) + 2 and normalized.endswith(suffix):
            normalized = normalized[: -len(suffix)]
            break
    return normalized


def _mask_id(id_val: Any) -> str:
    """Mask sensitive IDs for user logs (e.g. 69ea...265)."""
    s = str(id_val)
    if len(s) <= 8:
        return "****"
    return f"{s[:4]}...{s[-4:]}"


def _matches_term(term: str, text: str) -> bool:
    """Match by direct inclusion, normalized inclusion, or shared prefix."""
    if not term:
        return False
    if term in text:
        return True

    normalized_term = _normalize_term(term)
    if normalized_term and normalized_term in text:
        return True

    return len(normalized_term) >= 4 and any(
        token.startswith(normalized_term) or normalized_term.startswith(token)
        for token in re.findall(r"[a-z0-9]+", text)
        if len(token) >= 4
    )


def _keyword_rank_all(query: str, all_articles: list[Article], limit: int = 5) -> list[dict[str, Any]]:
    """Deterministic keyword search over title/content, sorted by relevance."""
    clean_query = _sanitize_query(query).lower()
    query_terms = [term for term in re.findall(r"[a-z0-9]+", clean_query) if term]

    ranked: list[dict[str, Any]] = []
    for article in all_articles:
        title_text = article.title.lower()
        content_text = article.content.lower()

        score = 0
        reasons: list[str] = []

        if clean_query and clean_query in title_text:
            score += 70
            reasons.append("title phrase")
        elif clean_query and clean_query in content_text:
            score += 45
            reasons.append("content phrase")

        title_hits = sum(1 for term in query_terms if _matches_term(term, title_text))
        content_hits = sum(1 for term in query_terms if _matches_term(term, content_text))

        if title_hits:
            score += title_hits * 20
            reasons.append("title keywords")
        if content_hits:
            score += content_hits * 8
            reasons.append("content keywords")

        if score <= 0:
            continue

        ranked.append(
            {
                "id": str(article.id),
                "score": min(100, score),
                "explanation": "Keyword search: " + ", ".join(reasons),
            }
        )

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked[:limit]


def _filter_ranked_matches(ranked_matches: list[dict[str, Any]], limit: int = 5) -> list[dict[str, Any]]:
    """Drop zero-score and very weak matches to keep results useful."""
    filtered = [item for item in ranked_matches if int(item.get("score", 0)) >= 15]
    return filtered[:limit]


def _parse_created_at(value: datetime | str | Any) -> datetime:
    """Best-effort datetime parser used for recent-article fallback sorting."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return datetime.min.replace(tzinfo=timezone.utc)
    return datetime.min.replace(tzinfo=timezone.utc)


def _fallback_recent_matches(all_articles: list[Article], limit: int = 5) -> list[dict[str, Any]]:
    """Return latest articles when query has no direct keyword hits."""
    recent = sorted(all_articles, key=lambda article: _parse_created_at(article.createdAt), reverse=True)
    return [
        {
            "id": str(article.id),
            "score": 12,
            "explanation": "No direct keyword match; showing a recent article.",
        }
        for article in recent[:limit]
    ]


def _build_article_preview(article: Article) -> str:
    """Trim article content before sending it to the reranker."""
    normalized = re.sub(r"\s+", " ", article.content).strip()
    return normalized[:MODEL_CONTENT_PREVIEW_CHARS]


def _safe_json_loads(payload: str) -> dict[str, Any] | None:
    """Parse JSON safely from a model response."""
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", payload, re.DOTALL)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


async def _rerank_with_gemini(
    query: str,
    candidates: list[Article],
    log_fn: Callable[[str], None] | None = None,
) -> list[dict[str, Any]]:
    """Use Gemini to rerank the strongest local candidates."""
    if not _gemini_api_key or not candidates:
        return []

    candidate_payload = [
        {
            "id": str(article.id),
            "title": article.title,
            "content_preview": _build_article_preview(article),
            "metadata": article.metadata,
            "tags": article.tags,
            "source": article.source,
        }
        for article in candidates
    ]

    system_prompt = (
        "You rank existing knowledge base articles for a user query. "
        "Return strict JSON with this shape: "
        '{"matches":[{"id":"article-id","score":0,"explanation":"short reason"}]}. '
        "Rules: only use article ids that were provided, scores must be integers from 0 to 100, "
        "prefer precision over recall, and return at most 5 matches."
    )
    user_prompt = (
        f"Query: {query}\n\n"
        f"Candidate articles:\n{json.dumps(candidate_payload, ensure_ascii=True)}"
    )

    def _call_gemini() -> str:
        model = genai.GenerativeModel(RESOLVED_GEMINI_MODEL)
        response = model.generate_content(
            [
                {"role": "user", "parts": [f"{system_prompt}\n\n{user_prompt}"]},
            ]
        )
        return (response.text or "").strip()

    content = await asyncio.to_thread(_call_gemini)
    # Technical logs removed to keep user interface and server logs clean
    parsed = _safe_json_loads(content)
    if not parsed:
        raise ValueError("Gemini reranker returned non-JSON content")

    matches = parsed.get("matches")
    if not isinstance(matches, list):
        raise ValueError("Gemini reranker response missing matches array")

    allowed_ids = {str(article.id) for article in candidates}
    reranked: list[dict[str, Any]] = []
    for item in matches[:5]:
        if not isinstance(item, dict):
            continue
        article_id = str(item.get("id", "")).strip()
        if article_id not in allowed_ids:
            continue
        try:
            score = max(0, min(100, int(item.get("score", 0))))
        except (TypeError, ValueError):
            score = 0
        explanation = str(item.get("explanation", "")).strip() or "Semantic relevance match"
        reranked.append({"id": article_id, "score": score, "explanation": explanation})

    return reranked


async def tool_json_store_search(all_articles: list[Article]) -> list[dict[str, Any]]:
    """Local retrieval tool kept for observability compatibility."""
    return [{"id": str(article.id), "title": article.title} for article in all_articles]


async def agent_search(query: str, seed: int | None = None, user_id: str | None = None) -> dict[str, Any]:
    """Execute local-only retrieval over existing articles."""
    run_id = str(uuid.uuid4())
    state_machine = StateMachine()
    start_time = datetime.now(timezone.utc)
    internal_logs: list[str] = []

    def _log(message: str) -> None:
        # Automatically mask potential IDs and UUIDs in all log messages
        # Mask 24-char hex IDs
        masked = re.sub(r"([0-9a-f]{24})", lambda m: _mask_id(m.group(0)), message)
        # Mask 36-char UUIDs
        masked = re.sub(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", 
                        lambda m: f"{m.group(0)[:4]}...{m.group(0)[-4:]}", masked)
        internal_logs.append(f"[{datetime.now(timezone.utc).isoformat()}] {masked}")

    try:
        state_machine.transition("query_received", AgentState.RECEIVING_QUERY)
        _log("Initializing search request...")

        state_machine.transition("fetch_articles", AgentState.FETCHING_ARTICLES)
        all_articles = await storage.get_articles(limit=1000, user_id=user_id)
        await tool_json_store_search(all_articles)
        _log("Scanning knowledge base for relevant content...")

        state_machine.transition("rank_articles", AgentState.RANKING)
        keyword_candidates = _filter_ranked_matches(
            _keyword_rank_all(query, all_articles, limit=RERANK_CANDIDATE_LIMIT),
            limit=RERANK_CANDIDATE_LIMIT,
        )
        ranked_matches = keyword_candidates[:5]
        if keyword_candidates and _gemini_api_key:
            candidate_ids = {str(item.get("id")) for item in keyword_candidates}
            candidate_articles = [article for article in all_articles if str(article.id) in candidate_ids]
            try:
                ranked_matches = await _rerank_with_gemini(query, candidate_articles, log_fn=_log)
                _log("Applying semantic ranking to improve accuracy...")
            except Exception as exc:
                logger.warning("Gemini reranking failed: %s", str(exc))
                # Suppress technical errors with a simple status message
                _log("Processing your search request...")
        if not ranked_matches and all_articles:
            ranked_matches = _fallback_recent_matches(all_articles, limit=5)
            _log("No direct matches found; showing most recent articles.")
        top_match = ranked_matches[0] if ranked_matches else {"id": None, "score": 0, "explanation": "No match found"}
        _log(f"Search completed. Found {len(ranked_matches)} relevant results.")

        state_machine.transition("build_response", AgentState.RESPONDING)
        results: list[dict[str, Any]] = []
        for match_item in ranked_matches:
            matched = next((article for article in all_articles if str(article.id) == str(match_item.get("id"))), None)
            if not matched:
                continue

            results.append(
                {
                    "article": {
                        "id": str(matched.id),
                        "title": matched.title,
                        "content": matched.content,
                        "metadata": matched.metadata,
                        "tags": matched.tags,
                        "source": matched.source,
                        "createdAt": matched.createdAt.isoformat() if isinstance(matched.createdAt, datetime) else matched.createdAt,
                    },
                    "score": int(match_item.get("score", 0)),
                    "explanation": str(match_item.get("explanation", "")),
                }
            )

        query_time_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
        state_machine.transition("done", AgentState.DONE)

        _append_run_log(
            {
                "runId": run_id,
                "query": query,
                "articlesScanned": len(all_articles),
                "latency": query_time_ms,
                "accuracy": top_match.get("score", 0),
            }
        )

        return {
            "runId": run_id,
            "results": results,
            "metrics": {
                "retrievalAccuracy": int(top_match.get("score", 0)),
                "queryTimeMs": query_time_ms,
                "articlesScanned": len(all_articles),
            },
            "stateTransitions": state_machine.transitions,
            "toolCalls": [],
            "currentState": "DONE",
            "seed": seed,
            "logs": internal_logs,
        }

    except Exception as exc:
        state_machine.transition("error", AgentState.ERROR)
        logger.error(f"Agent pipeline error: {str(exc)}")
        return {
            "runId": run_id,
            "results": [],
            "metrics": {
                "retrievalAccuracy": 0,
                "queryTimeMs": 0,
                "articlesScanned": 0,
            },
            "stateTransitions": state_machine.transitions,
            "toolCalls": [],
            "currentState": "ERROR",
            "seed": seed,
            "logs": internal_logs,
        }


async def run_evaluation() -> dict[str, Any]:
    """Admin-only stub for compatibility with the current frontend."""
    return {"status": "Evaluation is not available for local-only search."}
