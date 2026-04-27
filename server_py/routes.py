"""FastAPI route definitions mirroring the TS server contract.
Strictly complies with NeuralQuery Engineering & Security Standards.
"""

import os
import re
import logging
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Security, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import ValidationError
from slowapi import Limiter
from slowapi.util import get_remote_address

from .agent import agent_search, run_evaluation, run_logs
from .db import get_db
from .schemas import InsertArticle, LoginRequest, RegisterRequest, SearchRequest, SearchResponse, Article
from .storage import storage

# Configure structured logging
logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)
JWT_SECRET = os.getenv("JWT_SECRET")
ADMIN_KEY = os.getenv("ADMIN_KEY")

if not JWT_SECRET:
    if os.getenv("NODE_ENV") == "production":
        raise RuntimeError("CRITICAL: JWT_SECRET environment variable is NOT SET in production!")
    JWT_SECRET = "dev_secret_key_for_local_testing_only"

if not ADMIN_KEY and os.getenv("NODE_ENV") == "production":
    raise RuntimeError("CRITICAL: ADMIN_KEY environment variable is NOT SET in production!")

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api")


def _normalize_email(email: str) -> str:
    """Normalize email for consistency."""
    return email.strip().lower()


def _derive_username(email: str) -> str:
    """Derive a default username from an email address."""
    base = re.sub(r"[^a-zA-Z0-9_.-]", "", email.split("@", 1)[0]).strip("._-")
    return base or "user"


def _serialize_user(user_doc: dict) -> dict:
    """Serialize a user document for API response."""
    return {
        "id": str(user_doc["_id"]),
        "username": user_doc.get("username") or _derive_username(user_doc.get("email", "")),
        "email": user_doc.get("email", ""),
        "isAdmin": user_doc.get("isAdmin", False),
        "plan": user_doc.get("plan", "free"),
        "createdAt": user_doc.get("createdAt"),
    }


async def get_current_user(auth: HTTPAuthorizationCredentials = Security(security)):
    """Dependency to retrieve the authenticated user from a JWT."""
    if not auth:
        return None

    try:
        payload = jwt.decode(auth.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("userId")
        if not user_id or not ObjectId.is_valid(user_id):
            return None

        db = get_db()
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return None
        if user_doc.get("isBanned"):
            raise HTTPException(status_code=403, detail="Account suspended")

        return _serialize_user(user_doc)
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as exc:
        logger.error(f"Authentication error: {str(exc)}")
        return None


async def verify_admin(user: dict = Depends(get_current_user)):
    """Dependency to verify admin role."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def verify_admin_key(x_admin_key: str = Header(None)):
    """Security Rule: ALL admin endpoints MUST require X-Admin-Key header check."""
    if not ADMIN_KEY:
        # Allow if not in production and key not set
        if os.getenv("NODE_ENV") == "production":
            raise HTTPException(status_code=500, detail="Admin security not configured")
        return True
    
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return True


@router.get("/health")
async def health_check():
    """System health and database connectivity check."""
    try:
        db = get_db()
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Database unreachable")


@router.get("/articles", response_model=list[Article])
@limiter.limit("30/minute")
async def list_articles(
    request: Request,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: dict | None = Depends(get_current_user),
):
    """Public: List articles with visibility filtering."""
    return await storage.get_articles(limit=limit, offset=offset, user_id=user["id"] if user else None)


@router.post("/articles", status_code=201, response_model=Article)
@limiter.limit("10/minute")
async def create_article(
    request: Request,
    body: InsertArticle,
    user: dict = Depends(verify_admin),
):
    """Admin: Create a new knowledge base article."""
    return await storage.create_article(body, author_id=user["id"])


@router.delete("/articles/{article_id}", status_code=204)
@limiter.limit("10/minute")
async def delete_article(
    request: Request,
    article_id: str | int,
    user: dict = Depends(verify_admin),
):
    """Admin: Permanently delete an article."""
    # Convert string ID to int if it's numeric to match our secure mapping
    actual_id = int(article_id) if isinstance(article_id, str) and article_id.isdigit() else article_id
    
    existing = await storage.get_article(actual_id, user_id=user["id"])
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")

    deleted = await storage.delete_article(actual_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Failed to delete article")
    return None


@router.post("/agent/search", response_model=SearchResponse, response_model_by_alias=True)
@limiter.limit("10/minute")
async def search(
    request: Request,
    body: SearchRequest,
    user: dict | None = Depends(get_current_user),
):
    """Public: Execute agentic search with semantic ranking."""
    db = get_db()

    # Anonymous rate limiting
    if not user:
        ip = request.client.host
        usage = await db.anonymous_usage.find_one({"ip": ip})
        if usage and usage.get("count", 0) >= 4:
            raise HTTPException(status_code=403, detail="FREE_LIMIT_REACHED")

        await db.anonymous_usage.update_one(
            {"ip": ip},
            {"$inc": {"count": 1}, "$set": {"lastAt": datetime.now(timezone.utc)}},
            upsert=True,
        )

    try:
        return await agent_search(body.query, body.seed, user_id=user["id"] if user else None)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"Search error: {str(exc)}")
        raise HTTPException(status_code=500, detail="Agent pipeline failed")


@router.post("/agent/evaluate")
@limiter.limit("2/minute")
async def evaluate(request: Request, admin_auth: bool = Depends(verify_admin_key)):
    """Admin only: Run accuracy evaluation harness."""
    try:
        return await run_evaluation()
    except Exception as exc:
        logger.error(f"Evaluation error: {str(exc)}")
        raise HTTPException(status_code=500, detail="Evaluation harness failed")


@router.get("/agent/logs")
@limiter.limit("20/minute")
async def get_logs(request: Request, admin_auth: bool = Depends(verify_admin_key)):
    """Admin only: Retrieve execution logs."""
    return run_logs


@router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Retrieve current authenticated user session."""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/auth/register")
async def register(body: RegisterRequest):
    """Public: Create a new user account."""
    db = get_db()
    email = _normalize_email(body.email)

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    username = (body.username or _derive_username(email)).strip()
    hashed_password = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = datetime.now(timezone.utc)

    user_doc = {
        "username": username,
        "email": email,
        "hashedPassword": hashed_password,
        "isAdmin": False,
        "isBanned": False,
        "plan": "free",
        "createdAt": now,
        "updatedAt": now,
    }

    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = jwt.encode(
        {
            "userId": user_id,
            "email": email,
            "isAdmin": False,
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
        },
        JWT_SECRET,
        algorithm="HS256",
    )

    return {
        "user": _serialize_user({**user_doc, "_id": result.inserted_id}),
        "token": token,
    }


@router.post("/auth/login")
async def login(body: LoginRequest):
    """Public: Authenticate user and return JWT."""
    try:
        db = get_db()
        email = _normalize_email(body.email)
        user_doc = await db.users.find_one({"email": email})
        if not user_doc:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        password_in_db = user_doc.get("hashedPassword")
        if not password_in_db or not bcrypt.checkpw(body.password.encode("utf-8"), password_in_db.encode("utf-8")):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if user_doc.get("isBanned"):
            raise HTTPException(status_code=403, detail="Account suspended")

        token = jwt.encode(
            {
                "userId": str(user_doc["_id"]),
                "email": user_doc["email"],
                "isAdmin": user_doc.get("isAdmin", False),
                "exp": datetime.now(timezone.utc) + timedelta(days=7),
            },
            JWT_SECRET,
            algorithm="HS256",
        )

        return {
            "user": _serialize_user(user_doc),
            "token": token,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Login error: {str(exc)}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@router.post("/auth/logout")
async def logout():
    """Logout endpoint (client-side token removal)."""
    return {"message": "Logged out"}
