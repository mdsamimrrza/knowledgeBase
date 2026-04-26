
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def list_dbs():
    client = AsyncIOMotorClient(os.getenv('DATABASE_URL'))
    try:
        dbs = await client.list_database_names()
        print(f"Databases: {dbs}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(list_dbs())
