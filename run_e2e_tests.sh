#!/bin/bash
# Run E2E tests with full stack

set -e

echo "🚀 Starting E2E Test Suite..."
echo "=============================="

# Step 0: Ensure a clean E2E stack before starting
echo "🧹 Cleaning up previous E2E environment..."
# Only clean E2E containers - do NOT prune all containers (would affect main app)
docker compose -f docker-compose.e2e.yml down -v --remove-orphans 2>/dev/null || true
# Remove E2E-specific volume if it exists
docker volume rm headhunter_e2e_data 2>/dev/null || true

# Step 1: Start the E2E stack
echo "📦 Starting docker-compose.e2e.yml stack..."
docker compose -f docker-compose.e2e.yml up -d

# Step 2: Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check backend health
echo "🏥 Checking backend health..."
curl --retry 5 --retry-delay 3 --retry-connrefused http://localhost:30011/api/health || {
    echo "❌ Backend health check failed"
    docker compose -f docker-compose.e2e.yml logs backend-e2e
    exit 1
}

# Step 3: Reset database and run migrations
echo "🗄️  Resetting database schema..."
# Use psql directly to drop and recreate schema - most reliable approach
docker compose -f docker-compose.e2e.yml exec -T db-e2e \
    psql -U testuser -d headhunter_e2e_db -c \
    "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO testuser;"

echo "🗄️  Running database migrations..."
docker compose -f docker-compose.e2e.yml exec -T backend-e2e alembic upgrade head

# Step 4: Seed test data
echo "🌱 Seeding test database..."
docker compose -f docker-compose.e2e.yml exec -T backend-e2e \
    env PYTHONPATH=/app python tests/seed_test_data.py

# Step 5: Run Cypress tests
echo "🧪 Installing Cypress dependencies..."
docker compose -f docker-compose.e2e.yml exec -T cypress npm install

echo "🧪 Running Cypress E2E tests..."
docker compose -f docker-compose.e2e.yml exec -T cypress \
    npx cypress run \
    --spec "cypress/e2e/e2e_*.cy.js" \
    --browser electron

# Capture exit code
CYPRESS_EXIT=$?

# Step 6: Cleanup
echo "🧹 Cleaning up..."
docker compose -f docker-compose.e2e.yml down -v

# Report results
if [ $CYPRESS_EXIT -eq 0 ]; then
    echo "✅ All E2E tests passed!"
    exit 0
else
    echo "❌ Some E2E tests failed"
    exit 1
fi
