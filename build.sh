#!/bin/bash
# Build script that updates VERSION with current timestamp before building

# Get base version (strip any existing timestamp)
BASE_VERSION=$(cat VERSION | cut -d'-' -f1)

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d.%H%M")

# Create new version string
NEW_VERSION="${BASE_VERSION}-${TIMESTAMP}"

# Update VERSION files
echo "$NEW_VERSION" > VERSION
echo "$NEW_VERSION" > backend/VERSION

echo "📦 Version updated to: $NEW_VERSION"

# Run docker compose build
docker compose up -d --build "$@"
