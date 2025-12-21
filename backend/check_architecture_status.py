#!/usr/bin/env python3
"""
Check the status of Redis + Analytics Database Architecture

This script verifies that the system is properly configured to keep
the main database lightweight while using Redis for heavy operations.
"""

import os
import sys
import json
from pathlib import Path

def check_redis_status():
    """Check Redis availability and queue status"""
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

        # Check LLM queue
        queue_length = client.llen('llm_logs')

        print("✅ Redis Status:")
        print(f"   • Connection: OK")
        print(f"   • LLM Queue Length: {queue_length}")

        if queue_length > 100:
            print("   ⚠️  WARNING: Large queue backlog - worker may be down")
        elif queue_length > 1000:
            print("   ❌ CRITICAL: Very large queue - immediate attention needed")

        return True, queue_length
    except Exception as e:
        print("❌ Redis Status:")
        print(f"   • Connection: FAILED - {e}")
        print("   💡 LLM logs are being lost (by design) to protect main DB")
        return False, 0

def check_databases():
    """Check database configurations"""
    main_db = os.getenv('DATABASE_URL')
    analytics_db = os.getenv('ANALYTICS_DATABASE_URL', main_db)

    print("\n🗄️  Database Status:")

    if main_db:
        print(f"   • Main DB: Configured")
    else:
        print("   ❌ Main DB: NOT CONFIGURED")
        return False

    if analytics_db:
        if analytics_db == main_db:
            print("   • Analytics DB: Using main DB (simplified setup)")
        else:
            print("   • Analytics DB: Separate analytics database")
    else:
        print("   ❌ Analytics DB: NOT CONFIGURED")
        return False

    return True

def check_llm_logging_behavior():
    """Check if LLM logging is properly separated"""
    print("\n🤖 LLM Logging Status:")

    # Check if Redis is available for LLM logging
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

        # Test queue operation
        test_data = {"test": "architecture_check", "timestamp": str(os.times())}
        client.lpush('llm_logs', json.dumps(test_data))
        queued_item = client.rpop('llm_logs')  # Remove test item

        if queued_item:
            print("   ✅ LLM logs: Properly queued to Redis (no main DB impact)")
            return True
        else:
            print("   ⚠️  LLM logs: Redis queue test failed")
            return False

    except Exception as e:
        print("   ❌ LLM logs: Redis unavailable - logs are intentionally lost")
        print("   💡 This protects main DB performance (expected behavior)")
        return False

def check_worker_status():
    """Check if LLM log worker is running"""
    print("\n👷 Worker Status:")

    # Simple check - look for worker process
    try:
        import subprocess
        result = subprocess.run(['pgrep', '-f', 'llm_log_worker'],
                              capture_output=True, text=True)

        if result.returncode == 0:
            print("   ✅ LLM Log Worker: RUNNING")
            pids = result.stdout.strip().split('\n')
            print(f"   • Process IDs: {', '.join(pids)}")
            return True
        else:
            print("   ❌ LLM Log Worker: NOT RUNNING")
            print("   💡 Run: python -m app.workers.llm_log_worker")
            return False
    except Exception as e:
        print(f"   ⚠️  Worker check failed: {e}")
        return False

def provide_recommendations(redis_ok, db_ok, worker_ok, queue_length):
    """Provide actionable recommendations"""
    print("\n📋 Recommendations:")

    issues = []

    if not redis_ok:
        issues.append("• Start Redis server: redis-server")
        issues.append("• Set REDIS_HOST/REDIS_PORT if needed")

    if not db_ok:
        issues.append("• Configure DATABASE_URL and ANALYTICS_DATABASE_URL")

    if not worker_ok:
        issues.append("• Start LLM worker: python -m app.workers.llm_log_worker &")

    if queue_length > 100:
        issues.append("• Large Redis queue - check worker logs")

    if not issues:
        print("   🎉 All systems operational!")
        print("   • Main DB: Protected from heavy operations")
        print("   • Redis: Handling queues and caching")
        print("   • Analytics: Separated from production")
    else:
        print("   ⚠️  Action needed:")
        for issue in issues:
            print(f"   {issue}")

def main():
    print("🔍 Checking Redis + Analytics Architecture Status\n")

    redis_ok, queue_length = check_redis_status()
    db_ok = check_databases()
    llm_ok = check_llm_logging_behavior()
    worker_ok = check_worker_status()

    provide_recommendations(redis_ok, db_ok, worker_ok, queue_length)

    # Overall status
    all_ok = redis_ok and db_ok and worker_ok
    print(f"\n🏁 Overall Status: {'✅ HEALTHY' if all_ok else '❌ NEEDS ATTENTION'}")

    if all_ok:
        print("✨ Architecture working as designed - main DB stays lightweight!")
    else:
        print("🔧 Fix issues above to restore proper separation of concerns")

    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
