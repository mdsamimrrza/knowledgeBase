"""Data-access layer reading shared KV and NQ articles by MongoDB _id.
Complies with security rules: NEVER expose _id directly, map to id (int).
"""

from __future__ import annotations

import re
import zlib
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from .db import get_db
from .schemas import Article, InsertArticle


def _oid_to_int(oid: str | ObjectId) -> int:
    """Deterministically map a 24-char hex ObjectId to a unique integer.
    Uses the hex value directly to ensure 1:1 reversible mapping.
    """
    return int(str(oid), 16)


def _int_to_oid_str(val: int) -> str:
    """Reverse the integer mapping back to a 24-char hex string."""
    return f"{val:024x}"


def _to_article(doc: dict[str, Any]) -> Article:
    """Map a MongoDB document to a secure Article Pydantic model."""
    has_author = bool(doc.get("authorId"))
    return Article(
        id=str(doc["_id"]),
        title=doc.get("title", ""),
        content=doc.get("content", ""),
        metadata=doc.get("metadata", {}),
        tags=doc.get("tags", []),
        source=doc.get("source", "knowledge-vault" if has_author else "neuralquery"),
        createdAt=doc.get("createdAt", datetime.now(timezone.utc)),
    )


def _visibility_query(user_id: str | None) -> dict[str, Any]:
    """Build a MongoDB query that respects article visibility rules."""
    if user_id and ObjectId.is_valid(user_id):
        author_oid = ObjectId(user_id)
        return {
            "$or": [
                {"isPublic": True},
                {"authorId": author_oid},
                {"authorId": user_id},
                {"authorId": {"$exists": False}},
            ]
        }

    return {
        "$or": [
            {"isPublic": True},
            {"authorId": {"$exists": False}},
        ]
    }


class DatabaseStorage:
    """Async storage layer for NeuralQuery using Motor."""

    async def get_articles(
        self,
        limit: int = 50,
        offset: int = 0,
        user_id: str | None = None,
    ) -> list[Article]:
        """Fetch multiple articles with visibility checks."""
        db = get_db()
        docs = (
            await db.articles.find(_visibility_query(user_id))
            .sort("createdAt", -1)
            .skip(offset)
            .limit(limit)
            .to_list(length=limit)
        )
        return [_to_article(d) for d in docs]

    async def get_article(self, article_id: str | int, user_id: str | None = None) -> Article | None:
        """Fetch a single article by its mapped integer ID or ObjectId string."""
        db = get_db()
        try:
            if isinstance(article_id, str) and ObjectId.is_valid(article_id):
                oid = ObjectId(article_id)
            elif isinstance(article_id, int):
                oid = ObjectId(_int_to_oid_str(article_id))
            else:
                oid = ObjectId(article_id)
        except (InvalidId, ValueError, TypeError):
            return None

        doc = await db.articles.find_one({"_id": oid})
        if not doc:
            return None

        if doc.get("isPublic", True) is False:
            author_id = doc.get("authorId")
            if not user_id or (author_id is not None and str(author_id) != user_id):
                return None

        return _to_article(doc)

    async def create_article(self, data: InsertArticle, author_id: str | None = None) -> Article:
        """Create a new article in the database."""
        db = get_db()
        now = datetime.now(timezone.utc)
        
        # Clean slug generation
        slug = re.sub(r"-{2,}", "-", re.sub(r"[^\w\s-]", "", data.title.lower()).strip().replace(" ", "-")).strip("-")
        if not slug:
            slug = "article"

        doc: dict[str, Any] = {
            "title": data.title,
            "content": data.content,
            "metadata": data.metadata,
            "tags": [],
            "slug": slug,
            "isPublic": True,
            "source": "neuralquery",
            "links": [],
            "versions": [],
            "createdAt": now,
            "updatedAt": now,
        }
        if author_id:
            doc["authorId"] = ObjectId(author_id) if ObjectId.is_valid(author_id) else author_id

        result = await db.articles.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _to_article(doc)

    async def delete_article(self, article_id: str | int) -> bool:
        """Delete an article by its mapped integer ID or ObjectId string."""
        db = get_db()
        try:
            if isinstance(article_id, str) and ObjectId.is_valid(article_id):
                oid = ObjectId(article_id)
            elif isinstance(article_id, int):
                oid = ObjectId(_int_to_oid_str(article_id))
            else:
                oid = ObjectId(article_id)
        except (InvalidId, ValueError, TypeError):
            return False

        result = await db.articles.delete_one({"_id": oid})
        return result.deleted_count > 0


storage = DatabaseStorage()
