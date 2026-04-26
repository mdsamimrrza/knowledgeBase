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
    # Use the DB name from env var; default is the shared KV database
    db_name = os.getenv("DB_NAME", "knowledge-vault")
    _db = _client.get_default_database(default=db_name)
    # Force a connection check
    await _client.admin.command("ping")
    # Create indexes for optimal pagination and retrieval
    await _db.articles.create_index([("createdAt", -1)])
    # Anonymous usage tracking: unique IP and auto-reset after 24h
    await _db.anonymous_usage.create_index("ip", unique=True)
    await _db.anonymous_usage.create_index("lastAt", expireAfterSeconds=86400)
    print(f"Connected to MongoDB — database: {_db.name}")
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

