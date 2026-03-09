"""FastAPI route definitions – mirrors server/routes.ts."""

from typing import Annotated
from fastapi import APIRouter, Body, HTTPException, Request
from pydantic import ValidationError
from slowapi import Limiter
from slowapi.util import get_remote_address

from .agent import agent_search, run_evaluation, run_logs
from .schemas import InsertArticle, SearchRequest
from .storage import storage

# Rate limiter instance (shared with main.py)
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api")


# ========== Articles CRUD ==========

@router.get("/articles")
@limiter.limit("30/minute")
async def list_articles(request: Request):
    return await storage.get_articles()


@router.post("/articles", status_code=201)
@limiter.limit("10/minute")
async def create_article(request: Request, body: Annotated[InsertArticle, Body()]):
    article = await storage.create_article(body)
    return article


@router.delete("/articles/{article_id}", status_code=204)
@limiter.limit("10/minute")
async def delete_article(request: Request, article_id: str):
    try:
        aid = int(article_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid article ID")

    existing = await storage.get_article(aid)
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
    await storage.delete_article(aid)
    return None


# ========== Agent search ==========

@router.post("/agent/search")
@limiter.limit("5/minute")  # Stricter limit for AI calls (quota/cost protection)
async def search(request: Request, body: Annotated[SearchRequest, Body()]):
    try:
        result = await agent_search(body.query, body.seed)
        return result
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ========== Evaluation harness ==========

@router.post("/agent/evaluate")
@limiter.limit("2/minute")  # Very strict - runs many Gemini calls
async def evaluate(request: Request):
    try:
        return await run_evaluation()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ========== Run logs ==========

@router.get("/agent/logs")
@limiter.limit("20/minute")
async def get_logs(request: Request):
    return run_logs
