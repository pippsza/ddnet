#!/bin/bash
# MongoDB Backup Script for DDNet Bingo
# Usage: ./scripts/backup.sh [backup_dir]

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="ddnet-mongo-1"
DB_NAME="ddnet"

mkdir -p "$BACKUP_DIR"

echo "Starting MongoDB backup..."
docker exec "$CONTAINER_NAME" mongodump --db "$DB_NAME" --archive --gzip \
  > "$BACKUP_DIR/ddnet_${TIMESTAMP}.gz"

if [ $? -eq 0 ]; then
  echo "Backup saved to $BACKUP_DIR/ddnet_${TIMESTAMP}.gz"
  # Keep only last 7 backups
  ls -t "$BACKUP_DIR"/ddnet_*.gz | tail -n +8 | xargs -r rm
  echo "Cleanup complete."
else
  echo "Backup failed!"
  exit 1
fi
