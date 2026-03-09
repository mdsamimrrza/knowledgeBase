"""FastAPI application entry-point – mirrors server/index.ts."""
from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load .env BEFORE any other module reads env vars
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .db import close_db, connect_db
from .routes import router, limiter
from .schemas import InsertArticle
from .storage import storage


async def _seed_database() -> None:
    articles = await storage.get_articles()
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
        print("Seeded 3 default articles")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    await storage.migrate_old_documents()
    await _seed_database()
    yield
    # Shutdown
    await close_db()


app = FastAPI(title="NeuralQuery API", lifespan=lifespan)

# Rate limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS – allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request logging middleware ----------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        duration = int((time.time() - start) * 1000)
        formatted = time.strftime("%I:%M:%S %p")
        print(f"{formatted} [fastapi] {request.method} {request.url.path} {response.status_code} in {duration}ms")
    return response


# Include API routes
app.include_router(router)


# ---------- Static file serving (production) ----------
_dist_public = Path(__file__).resolve().parent.parent / "dist" / "public"

if _dist_public.exists():
    app.mount("/assets", StaticFiles(directory=str(_dist_public / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the SPA index.html for any non-API route."""
        file = _dist_public / full_path
        if file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(_dist_public / "index.html"))
