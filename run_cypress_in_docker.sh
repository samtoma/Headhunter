#!/bin/bash
# Script to run the frontend dev server and Cypress tests inside the Docker image
# Usage: ./run_cypress_in_docker.sh

set -e

# Start the Vite dev server in background
npm run dev -- --host &
DEV_PID=$!

echo "Started dev server (PID $DEV_PID)"

# Wait for the server to be ready (adjust if needed)
sleep 12

# Run Cypress tests (headless Chrome)
# Use --browser chrome and no-sandbox flags for Docker
npx cypress run --spec "cypress/e2e/auth.cy.js"

# Capture Cypress exit code
CY_EXIT=$?

# Kill the dev server
kill $DEV_PID || true

echo "Dev server stopped"

exit $CY_EXIT
