"""FastAPI application entry-point – mirrors server/index.ts.
Strictly complies with NeuralQuery Engineering & Security Standards.
"""
from __future__ import annotations

import os
import time
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Configure structured logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env BEFORE any other module reads env vars
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .db import close_db, connect_db
from .routes import router, limiter
from .schemas import InsertArticle
from .storage import storage
from .agent import configure_gemini


async def _seed_database() -> None:
    """Initialize the database with default articles if empty."""
    articles = await storage.get_articles(limit=1)
    if len(articles) == 0:
        await storage.create_article(
            InsertArticle(
                title="Agentic Setup Guide",
                content="This document applies to all teams (single-agent + tools and multi-agent). It standardizes environment setup, project workflow, required engineering practices, and a recommended 'agentic runtime' stack.",
                metadata={"category": "guide"},
            )
        )
        await storage.create_article(
            InsertArticle(
                title="Observability Requirements",
                content="Every run must have a Run ID. Log: agent name, prompt/inputs, tool calls, tool I/O, state transitions, timestamps. Store logs as JSON Lines (recommended) or SQLite.",
                metadata={"category": "requirements"},
            )
        )
        await storage.create_article(
            InsertArticle(
                title="Metrics Guidelines",
                content="Minimum 3 quantitative metrics. Minimum 10 scenarios (synthetic acceptable). Must show baseline comparison (single-agent baseline for multi-agent; no-tool baseline for single-agent track).",
                metadata={"category": "metrics"},
            )
        )
        logger.info("Database seeded with 3 default articles")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI application."""
    # Startup
    try:
        configure_gemini()
        await connect_db()
        await _seed_database()
        logger.info("NeuralQuery API startup complete")
    except Exception as e:
        logger.error(f"Startup failure: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    await close_db()
    logger.info("NeuralQuery API shutdown complete")


app = FastAPI(title="NeuralQuery API", lifespan=lifespan)

# Rate limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS – restrict origins based on environment
_cors_env = os.getenv("CORS_ORIGINS")
if _cors_env:
    _allowed_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    # Secure defaults for development and production domains
    _allowed_origins = [
        "http://localhost:5173", 
        "http://localhost:5000", 
        "http://127.0.0.1:5173", 
        "https://knowledgebase-wdt5.onrender.com", 
        "https://knowledge-vault.up.railway.app"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Inject mandatory security headers into every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Structured request logging for observability."""
    start = time.time()
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        duration = int((time.time() - start) * 1000)
        logger.info(f"{request.method} {request.url.path} {response.status_code} {duration}ms")
    return response


# Include API routes
app.include_router(router)


# ---------- Static file serving (production) ----------
_dist_public = Path(__file__).resolve().parent.parent / "dist" / "public"

if _dist_public.exists():
    app.mount("/assets", StaticFiles(directory=str(_dist_public / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA index.html for any non-API route."""
        file = _dist_public / full_path
        if file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(_dist_public / "index.html"))
else:
    logger.warning("Production 'dist/public' folder not found. SPA serving disabled.")
