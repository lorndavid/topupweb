#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  VidTopUp — Automated MongoDB Backup Script for Debian Docker
# ═══════════════════════════════════════════════════════════════════
#  Dumps the MongoDB container to a gzipped archive with date rotation.
#  Usage:
#    ./scripts/backup-mongo.sh
#  Or add to crontab:
#    0 3 * * * /var/www/topup-api/scripts/backup-mongo.sh >> /var/log/mongo-backup.log 2>&1
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

CONTAINER_NAME="vidtopup-mongo"
DB_NAME="${MONGODB_DB_NAME:-gametopup}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/topup-mongo}"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/mongo_${DB_NAME}_${TIMESTAMP}.archive.gz"

echo "=========================================="
echo " Starting MongoDB Backup: $(date)"
echo " Database: ${DB_NAME}"
echo " Destination: ${BACKUP_FILE}"
echo "=========================================="

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Check if MongoDB container is running
if ! docker ps --format '{{.Names}}' | grep -wq "${CONTAINER_NAME}"; then
  echo "❌ Error: Docker container '${CONTAINER_NAME}' is not running!" >&2
  exit 1
fi

# Run mongodump inside container and stream out to compressed file
echo "📦 Dumping database..."
docker exec "${CONTAINER_NAME}" mongodump --db="${DB_NAME}" --archive --gzip > "${BACKUP_FILE}"

# Verify file was created and is non-empty
if [ -s "${BACKUP_FILE}" ]; then
  FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "✅ Backup successfully created: ${BACKUP_FILE} (${FILE_SIZE})"
else
  echo "❌ Error: Backup file is empty or missing!" >&2
  exit 1
fi

# Rotate backups older than retention period
echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "mongo_${DB_NAME}_*.archive.gz" -type f -mtime +${RETENTION_DAYS} -exec rm -f {} +

echo "🎉 Backup job finished: $(date)"
echo "=========================================="
