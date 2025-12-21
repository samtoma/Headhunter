from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
from app.core.config import settings

# Use the internal Docker network URL for Redis
REDIS_URL = settings.REDIS_URL

async def init_cache():
    """Initialize FastAPI-Cache with Redis backend"""
    try:
        redis = await aioredis.from_url(REDIS_URL, encoding="utf8", decode_responses=True)
        FastAPICache.init(RedisBackend(redis), prefix="headhunter-cache")
        print(f"✅ Cache initialized with Redis at {REDIS_URL}")
    except Exception as e:
        print(f"❌ Failed to initialize cache: {e}")
