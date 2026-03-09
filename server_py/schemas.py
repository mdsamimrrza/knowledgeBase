"""Pydantic models mirroring shared/schema.ts"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


# ---------- Article ----------
class InsertArticle(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Article(BaseModel):
    id: int
    title: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    createdAt: datetime | str


# ---------- State Machine ----------
class AgentState(str, Enum):
    IDLE = "IDLE"
    RECEIVING_QUERY = "RECEIVING_QUERY"
    FETCHING_ARTICLES = "FETCHING_ARTICLES"
    RANKING = "RANKING"
    RESPONDING = "RESPONDING"
    DONE = "DONE"
    ERROR = "ERROR"


class StateTransition(BaseModel):
    from_state: str = Field(..., alias="from")
    event: str
    to: str
    timestamp: str

    model_config = {"populate_by_name": True}


class ToolCall(BaseModel):
    tool: str
    input: Any
    output: Any
    durationMs: int


# ---------- Search ----------
class SearchRequest(BaseModel):
    query: str
    seed: Optional[int] = None


class SearchResult(BaseModel):
    article: Article
    score: Optional[int | float] = None
    explanation: Optional[str] = None


class SearchResponse(BaseModel):
    runId: str
    results: list[SearchResult]
    metrics: dict[str, Any]
    stateTransitions: list[StateTransition]
    toolCalls: list[ToolCall]
    currentState: str
    seed: Optional[int] = None
    logs: list[str] = []


# ---------- Evaluation ----------
class EvalScenarioResult(BaseModel):
    scenarioId: int
    query: str
    matchedTitle: Optional[str] = None
    score: int | float = 0
    hit: bool = False
    queryTimeMs: int = 0
    runId: str = ""


class EvalSummary(BaseModel):
    scenarios: list[EvalScenarioResult]
    summary: dict[str, Any]


# ---------- Error ----------
class ErrorResponse(BaseModel):
    message: str
    field: Optional[str] = None
