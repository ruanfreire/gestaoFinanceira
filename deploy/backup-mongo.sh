#!/bin/bash
# Backup diário MongoDB — otimizado para VM 1 GB RAM
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"
BACKUP_DIR="${BACKUP_DIR:-/opt/gestao-financeira/backups/mongo}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
ENV_FILE="${APP_DIR}/.env"

mkdir -p "$BACKUP_DIR"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source <(grep -E '^MONGO_URI=' "$ENV_FILE" | sed 's/^/export /')
fi

MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017/finance}"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
ARCHIVE="${BACKUP_DIR}/mongo-${STAMP}.gz"

echo "==> Backup MongoDB → ${ARCHIVE}"
mongodump --uri="$MONGO_URI" --gzip --archive="$ARCHIVE"

echo "==> Removendo backups com mais de ${RETENTION_DAYS} dias"
find "$BACKUP_DIR" -name 'mongo-*.gz' -type f -mtime +"$RETENTION_DAYS" -delete

ls -lh "$BACKUP_DIR" | tail -5
echo "==> Backup concluído"
