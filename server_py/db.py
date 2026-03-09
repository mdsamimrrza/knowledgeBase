"""MongoDB connection + helper utilities using Motor (async pymongo driver)."""
from __future__ import annotations
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> AsyncIOMotorDatabase:
    """Connect (or reuse) the Motor client and return the database handle."""
    global _client, _db
    if _db is not None:
        return _db

    mongo_uri = os.getenv("DATABASE_URL")
    if not mongo_uri:
        raise RuntimeError("DATABASE_URL must be set. Did you forget to provision a database?")

    _client = AsyncIOMotorClient(
        mongo_uri,
        maxPoolSize=20,
        minPoolSize=5,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=10000,
    )
    # Use the default database from the URI, or fall back to "neuralquery"
    _db = _client.get_default_database(default="neuralquery")
    # Force a connection check
    await _client.admin.command("ping")
    print("Connected to MongoDB")
    return _db


async def close_db() -> None:
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None


def get_db() -> AsyncIOMotorDatabase:
    """Return the already-connected db handle (call connect_db first)."""
    if _db is None:
        raise RuntimeError("Database not connected – call connect_db() first")
    return _db


async def get_next_id(name: str) -> int:
    """Auto-increment counter, mirrors the Mongoose Counter collection."""
    db = get_db()
    result = await db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    if result is None:
        raise RuntimeError(f"Failed to generate ID for \"{name}\"")
    return int(result["seq"])
