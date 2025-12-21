#!/usr/bin/env python3
"""
Setup script for Redis + Analytics Database Architecture

This script helps configure the proper separation of concerns:
- Main DB: Lightweight business operations
- Redis: Caching and queuing layer
- Analytics DB: LLM logs and heavy analytics

Usage:
    python setup_analytics_architecture.py
"""

import os
import sys
import subprocess
from pathlib import Path

def check_redis():
    """Check if Redis is available"""
    try:
        import redis
        client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            password=os.getenv('REDIS_PASSWORD'),
            decode_responses=True
        )
        client.ping()
        print("✅ Redis is available and connected")
        return True
    except Exception as e:
        print(f"❌ Redis not available: {e}")
        return False

def check_analytics_db():
    """Check if analytics database is configured"""
    analytics_url = os.getenv("ANALYTICS_DATABASE_URL", os.getenv("DATABASE_URL"))

    if not analytics_url:
        print("❌ No database URL configured")
        return False

    print(f"✅ Analytics database configured: {analytics_url.replace('://', '://***:***@')}")
    return True

def start_redis_worker():
    """Start the LLM log worker"""
    try:
        print("🚀 Starting LLM Log Worker...")
        # Run in background
        subprocess.Popen([
            sys.executable, "-m", "app.workers.llm_log_worker"
        ], cwd=Path(__file__).parent)
        print("✅ LLM Log Worker started in background")
        return True
    except Exception as e:
        print(f"❌ Failed to start worker: {e}")
        return False

def main():
    print("🔧 Setting up Redis + Analytics Database Architecture\n")

    # Check Redis
    redis_ok = check_redis()
    if not redis_ok:
        print("\n💡 To fix Redis:")
        print("  1. Install Redis: apt-get install redis-server")
        print("  2. Start Redis: redis-server")
        print("  3. Set environment variables if needed:")
        print("     export REDIS_HOST=localhost")
        print("     export REDIS_PORT=6379")

    # Check Analytics DB
    db_ok = check_analytics_db()
    if not db_ok:
        print("\n💡 To configure analytics database:")
        print("  export ANALYTICS_DATABASE_URL='postgresql://user:pass@host/analytics_db'")
        print("  (Or use main DB: export ANALYTICS_DATABASE_URL=$DATABASE_URL)")

    if redis_ok and db_ok:
        print("\n🎉 Architecture components ready!")
        print("   • Redis: ✅ Available for caching/queuing")
        print("   • Analytics DB: ✅ Configured for LLM logs")
        print("   • Main DB: ✅ Protected from heavy LLM logging")

        # Start worker
        if start_redis_worker():
            print("\n🚀 System Status:")
            print("   • LLM operations → Redis queue → Analytics DB")
            print("   • CV operations → Redis cache → Main DB (when needed)")
            print("   • API operations → Main DB (lightweight)")
            print("\n✨ Architecture working as designed!")
        else:
            print("\n⚠️  Worker failed to start - check logs")
    else:
        print("\n❌ Architecture not ready - fix issues above")
        sys.exit(1)

if __name__ == "__main__":
    main()
