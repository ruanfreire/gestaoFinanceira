#!/bin/bash
# Instala cron diário de backup MongoDB (03:00 UTC) para o usuário atual
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"
LOG_FILE="${LOG_FILE:-/var/log/gestao-mongo-backup.log}"
MARKER="# gestao-financeira-mongo-backup"

mkdir -p "$(dirname "$BACKUP_DIR" 2>/dev/null || echo "$APP_DIR/backups/mongo")"
chmod +x "$APP_DIR/deploy/backup-mongo.sh" 2>/dev/null || true

if ! command -v crontab >/dev/null 2>&1; then
  echo "AVISO: crontab não disponível; configure manualmente o backup diário"
  exit 0
fi

if ! command -v mongodump >/dev/null 2>&1; then
  echo "AVISO: mongodump não encontrado; cron de backup não configurado"
  exit 0
fi

# Log com permissão para o usuário de deploy (opc)
if [[ ! -f "$LOG_FILE" ]]; then
  sudo touch "$LOG_FILE" 2>/dev/null || touch "$LOG_FILE"
  sudo chown "$(whoami):$(whoami)" "$LOG_FILE" 2>/dev/null || true
  chmod 644 "$LOG_FILE" 2>/dev/null || true
fi

CRON_LINE="0 3 * * * APP_DIR=$APP_DIR BACKUP_DIR=$APP_DIR/backups/mongo $MARKER bash $APP_DIR/deploy/backup-mongo.sh >> $LOG_FILE 2>&1"

EXISTING=$(crontab -l 2>/dev/null | grep -v "$MARKER" | grep -v 'deploy/backup-mongo.sh' || true)
{
  echo "$EXISTING"
  echo "$CRON_LINE"
} | crontab -

echo "==> Cron de backup MongoDB instalado (03:00 UTC diário)"
crontab -l | grep "$MARKER" || true
