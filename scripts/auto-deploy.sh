#!/bin/bash
# ==============================================================================
# VidTopUp Production Auto-Deploy & Rollback Daemon with Telegram Alerts
# ==============================================================================
# Checks for new commits on origin/main:
# - If only frontend/admin changed -> updates git without touching Docker.
# - If backend changed -> rebuilds backend, checks /api/health.
# - If health check fails -> immediately rolls back to previous working commit!
# - Sends real-time Telegram status alerts to your personal chat ID.
# ==============================================================================
set -u

REPO_DIR="/opt/topupweb"
cd "$REPO_DIR" || exit 1

# Load environment variables (supports existing TELEGRAM_BOT_TOKEN or dedicated DEPLOY_TELEGRAM_BOT_TOKEN)
if [ -f "$REPO_DIR/.env" ]; then
  export TELEGRAM_BOT_TOKEN=$(grep -E '^(DEPLOY_TELEGRAM_BOT_TOKEN|TELEGRAM_BOT_TOKEN)=' "$REPO_DIR/.env" | head -n 1 | cut -d '=' -f2- | tr -d '\r"' || true)
  export TELEGRAM_CHAT_ID=$(grep -E '^(DEPLOY_TELEGRAM_CHAT_ID|TELEGRAM_CHAT_ID)=' "$REPO_DIR/.env" | head -n 1 | cut -d '=' -f2- | tr -d '\r"' || true)
fi

send_telegram() {
  local msg="$1"
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] && [ "$TELEGRAM_BOT_TOKEN" != "your_telegram_bot_token" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${msg}" \
      -d "parse_mode=HTML" > /dev/null 2>&1 || true
  fi
}

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
COMMIT_MSG=$(git log -1 --pretty=%B "$REMOTE_COMMIT" 2>/dev/null | head -n 1 || echo "Update")

send_telegram "🚀 <b>[VidTopUp] Backend Deploy Started</b>%0A%0A📝 <b>Commit:</b> <code>${REMOTE_COMMIT:0:7}</code> — ${COMMIT_MSG}%0A⏳ Rebuilding Docker container on Debian VPS..."

rollback() {
  echo "🚨 DEPLOYMENT FAILED! Initiating automatic rollback to previous healthy commit: $PREV_COMMIT..."
  git reset --hard "$PREV_COMMIT"
  echo "🔄 Rebuilding previous backend image..."
  docker compose -f docker-compose.backend.yml up -d --build --no-deps backend
  
  sleep 5
  if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo "✅ Successfully rolled back to $PREV_COMMIT! Production is online."
    send_telegram "🚨 <b>[VidTopUp] Deploy FAILED & Rolled Back</b>%0A%0A❌ Failed Commit: <code>${REMOTE_COMMIT:0:7}</code>%0A🔄 <b>Auto-Rollback:</b> Restored <code>${PREV_COMMIT:0:7}</code>%0A✅ Production API is back online."
  else
    echo "❌ CRITICAL: Service still unhealthy after rollback. Check 'docker logs vidtopup-backend'."
    send_telegram "❌ <b>[VidTopUp] CRITICAL ALERT</b>%0A%0AService is unhealthy even after rollback to <code>${PREV_COMMIT:0:7}</code>. Please inspect server logs immediately!"
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
send_telegram "🎉 <b>[VidTopUp] Backend Deploy SUCCESS!</b>%0A%0A✅ <b>Live Commit:</b> <code>${REMOTE_COMMIT:0:7}</code> — ${COMMIT_MSG}%0A🩺 <b>Health Check:</b> HTTP 200 OK%0A🌐 <b>Endpoint:</b> https://api.vidtopup.store/api/health"
