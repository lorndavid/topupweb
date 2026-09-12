#!/bin/bash
# ==============================================================================
# VidTopUp Production Auto-Deploy & Rollback Daemon
# ==============================================================================
# Checks for new commits on origin/main:
# - If only frontend/admin changed -> updates git without touching Docker.
# - If backend changed -> rebuilds backend, checks /api/health.
# - If health check fails -> immediately rolls back to previous working commit!
# ==============================================================================
set -u

REPO_DIR="/opt/topupweb"
cd "$REPO_DIR" || exit 1

# Fetch remote changes silently
git fetch origin main > /dev/null 2>&1 || exit 0

LOCAL_COMMIT=$(git rev-parse HEAD 2>/dev/null)
REMOTE_COMMIT=$(git rev-parse origin/main 2>/dev/null)

# Exit if already up to date
if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
  exit 0
fi

echo "🚀 [$(date '+%Y-%m-%d %H:%M:%S')] New commit detected on origin/main: $REMOTE_COMMIT"
echo "📌 Current local commit: $LOCAL_COMMIT"

# Check if changes affect backend
DIFF_FILES=$(git diff --name-only "$LOCAL_COMMIT" "$REMOTE_COMMIT" 2>/dev/null || true)
BACKEND_CHANGED=$(echo "$DIFF_FILES" | grep -E '^(backend/|docker-compose.backend.yml)' || true)

if [ -z "$BACKEND_CHANGED" ]; then
  echo "ℹ️ Only frontend or admin changed. Syncing git pointer (Docker untouched)."
  git reset --hard origin/main > /dev/null 2>&1
  exit 0
fi

echo "📦 Backend files modified! Initiating safe deployment with auto-rollback..."
PREV_COMMIT="$LOCAL_COMMIT"

rollback() {
  echo "🚨 DEPLOYMENT FAILED! Initiating automatic rollback to previous healthy commit: $PREV_COMMIT..."
  git reset --hard "$PREV_COMMIT"
  echo "🔄 Rebuilding previous backend image..."
  docker compose -f docker-compose.backend.yml up -d --build --no-deps backend
  
  sleep 5
  if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo "✅ Successfully rolled back to $PREV_COMMIT! Production is online."
  else
    echo "❌ CRITICAL: Service still unhealthy after rollback. Check 'docker logs vidtopup-backend'."
  fi
}

# Pull latest code
echo "📥 Applying commit: $REMOTE_COMMIT"
git reset --hard origin/main

echo "🏗️ Rebuilding backend Docker container..."
if ! docker compose -f docker-compose.backend.yml up -d --build --no-deps backend; then
  echo "❌ Docker build failed!"
  rollback
  exit 1
fi

echo "🩺 Verifying health endpoint (http://127.0.0.1:3001/api/health)..."
HEALTHY=false
for i in $(seq 1 15); do
  sleep 3
  if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    HEALTHY=true
    echo "✅ Health check passed! (attempt $i/15)"
    break
  fi
  echo "⏳ Waiting for backend to be ready... ($i/15)"
done

if [ "$HEALTHY" = false ]; then
  echo "❌ Health check timed out after 45s!"
  rollback
  exit 1
fi

echo "🧹 Cleaning up old dangling Docker images..."
docker image prune -f > /dev/null 2>&1 || true

echo "🎉 Deployment successfully completed! Live commit: $REMOTE_COMMIT"
