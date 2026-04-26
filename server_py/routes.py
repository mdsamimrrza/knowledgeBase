"""FastAPI route definitions mirroring the TS server contract."""

import os
import re
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import ValidationError
from slowapi import Limiter
from slowapi.util import get_remote_address

from .agent import agent_search, run_evaluation, run_logs
from .db import get_db
from .schemas import InsertArticle, LoginRequest, RegisterRequest, SearchRequest
from .storage import storage

security = HTTPBearer(auto_error=False)
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    if os.getenv("NODE_ENV") == "production":
        raise RuntimeError("CRITICAL: JWT_SECRET environment variable is NOT SET in production!")
    JWT_SECRET = "dev_secret_key_for_local_testing_only"

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _derive_username(email: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_.-]", "", email.split("@", 1)[0]).strip("._-")
    return base or "user"


def _serialize_user(user_doc: dict) -> dict:
    return {
        "id": str(user_doc["_id"]),
        "username": user_doc.get("username") or _derive_username(user_doc.get("email", "")),
        "email": user_doc.get("email", ""),
        "isAdmin": user_doc.get("isAdmin", False),
        "plan": user_doc.get("plan", "free"),
        "createdAt": user_doc.get("createdAt"),
    }


async def get_current_user(auth: HTTPAuthorizationCredentials = Security(security)):
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
        print(f"Auth error: {exc}")
        return None


async def verify_admin(user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


@router.get("/health")
async def health_check():
    try:
        db = get_db()
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unreachable")


@router.get("/articles")
@limiter.limit("30/minute")
async def list_articles(
    request: Request,
    limit: int = Query(default=50, ge=1, le=200, description="Max articles to return"),
    offset: int = Query(default=0, ge=0, description="Number of articles to skip"),
    user: dict | None = Depends(get_current_user),
):
    return await storage.get_articles(limit=limit, offset=offset, user_id=user["id"] if user else None)


@router.post("/articles", status_code=201)
@limiter.limit("10/minute")
async def create_article(
    request: Request,
    body: InsertArticle,
    user: dict = Depends(verify_admin),
):
    return await storage.create_article(body, author_id=user["id"])


@router.delete("/articles/{article_id}", status_code=204)
@limiter.limit("10/minute")
async def delete_article(
    request: Request,
    article_id: str,
    user: dict = Depends(verify_admin),
):
    existing = await storage.get_article(article_id, user_id=user["id"])
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")

    deleted = await storage.delete_article(article_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Article not found")
    return None


@router.post("/agent/search")
@limiter.limit("10/minute")
async def search(
    request: Request,
    body: SearchRequest,
    user: dict | None = Depends(get_current_user),
):
    db = get_db()

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
        print(f"Error in /agent/search: {exc}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")


@router.post("/agent/evaluate")
@limiter.limit("2/minute")
async def evaluate(request: Request):
    try:
        return await run_evaluation()
    except Exception as exc:
        print(f"Error in /agent/evaluate: {exc}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")


@router.get("/agent/logs")
@limiter.limit("20/minute")
async def get_logs(request: Request):
    return run_logs


@router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/auth/register")
async def register(body: RegisterRequest):
    db = get_db()
    email = _normalize_email(body.email)

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    username = (body.username or _derive_username(email)).strip()
    hashed_password = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = datetime.now(timezone.utc)

    user_doc = {
        "username": username or _derive_username(email),
        "email": email,
        "hashedPassword": hashed_password,
        "isAdmin": False,
        "isBanned": False,
        "plan": "free",
        "otpEnabled": False,
        "otpSecret": None,
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
    try:
        db = get_db()
        email = _normalize_email(body.email)
        user_doc = await db.users.find_one({"email": email})
        if not user_doc:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        password_in_db = user_doc.get("hashedPassword") or user_doc.get("password")
        if not password_in_db:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not bcrypt.checkpw(body.password.encode("utf-8"), password_in_db.encode("utf-8")):
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
        print(f"LOGIN ERROR: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/auth/logout")
async def logout():
    return {"message": "Logged out"}
