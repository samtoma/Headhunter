#!/bin/bash
# Run E2E tests with full stack

set -e

echo "🚀 Starting E2E Test Suite..."
echo "=============================="

# Step 0: Ensure a clean E2E stack before starting
docker compose -f docker-compose.e2e.yml down -v --remove-orphans
docker compose -f docker-compose.e2e.yml rm -s -f -v db-e2e # Ensure DB volume is gone

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

# Step 3: Run database migrations
echo "🗄️  Running database migrations..."
docker compose -f docker-compose.e2e.yml exec -T backend-e2e alembic upgrade head

# Step 4: Seed test data
echo "🌱 Seeding test database..."
docker compose -f docker-compose.e2e.yml exec -T backend-e2e python tests/seed_test_data.py

# Step 5: Run Cypress tests
echo "🧪 Running Cypress E2E tests..."
docker compose -f docker-compose.e2e.yml run --rm cypress \
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
