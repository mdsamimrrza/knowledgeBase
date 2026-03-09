"""Data-access layer – mirrors server/storage.ts."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any

from .db import get_db, get_next_id
from .schemas import Article, InsertArticle


def _to_article(doc: dict[str, Any]) -> Article:
    return Article(
        id=doc["id"],
        title=doc["title"],
        content=doc["content"],
        metadata=doc.get("metadata", {}),
        createdAt=doc.get("createdAt", datetime.now(timezone.utc)),
    )


class DatabaseStorage:
    """Thin async wrapper around the articles collection."""

    async def migrate_old_documents(self) -> None:
        """Assign numeric IDs to any legacy documents that lack one."""
        db = get_db()
        cursor = db.articles.find({"$or": [{"id": {"$exists": False}}, {"id": None}]})
        count = 0
        async for doc in cursor:
            new_id = await get_next_id("article")
            await db.articles.update_one({"_id": doc["_id"]}, {"$set": {"id": new_id}})
            count += 1
        if count:
            print(f"Migrated {count} legacy articles with numeric IDs")

    async def get_articles(self, limit: int = 50, offset: int = 0) -> list[Article]:
        db = get_db()
        docs = await db.articles.find().sort("createdAt", 1).skip(offset).limit(limit).to_list(length=limit)
        return [_to_article(d) for d in docs]

    async def get_article(self, article_id: int) -> Article | None:
        db = get_db()
        doc = await db.articles.find_one({"id": article_id})
        return _to_article(doc) if doc else None

    async def create_article(self, data: InsertArticle) -> Article:
        db = get_db()
        new_id = await get_next_id("article")
        now = datetime.now(timezone.utc)
        doc = {
            "id": new_id,
            "title": data.title,
            "content": data.content,
            "metadata": data.metadata,
            "createdAt": now,
        }
        await db.articles.insert_one(doc)
        return _to_article(doc)

    async def delete_article(self, article_id: int) -> None:
        db = get_db()
        await db.articles.delete_one({"id": article_id})


storage = DatabaseStorage()
