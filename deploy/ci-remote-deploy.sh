#!/bin/bash
# Executado na VM após /tmp/release.tar.gz estar presente.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"

if [ ! -f /tmp/release.tar.gz ]; then
  echo "::error::/tmp/release.tar.gz não encontrado na VM"
  exit 1
fi

sudo mkdir -p "$APP_DIR"
sudo chown opc:opc "$APP_DIR"
STAGING=$(mktemp -d)
trap 'rm -rf "$STAGING"' EXIT
tar -xzf /tmp/release.tar.gz -C "$STAGING"
sudo rsync -a "$STAGING/" "$APP_DIR/"
sudo chown -R opc:opc "$APP_DIR"
sudo chmod o+x "$APP_DIR" "$APP_DIR/frontend" "$APP_DIR/frontend/dist" 2>/dev/null || true
sudo chmod -R o+rX "$APP_DIR/frontend/dist" 2>/dev/null || true
cd "$APP_DIR"
chmod +x deploy/install-native.sh deploy/maintenance.sh deploy/backup-mongo.sh deploy/setup-backup-cron.sh deploy/ssl/*.sh 2>/dev/null || true

DEPLOY_OK=1
if ! bash deploy/install-native.sh; then
  DEPLOY_OK=0
fi
if ! bash deploy/maintenance.sh off; then
  DEPLOY_OK=0
  bash deploy/maintenance.sh force-off || true
fi

echo "==> Verificação final dos serviços"
ok=0
for i in $(seq 1 30); do
  if sudo systemctl is-active --quiet gestao-financeira-backend \
    && sudo systemctl is-active --quiet nginx \
    && sudo systemctl is-active --quiet mongod; then
    ok=1
    break
  fi
  echo "==> Aguardando serviços ficarem ativos ($i/30)..."
  sleep 2
done
if [ "$ok" -ne 1 ]; then
  DEPLOY_OK=0
  echo "::error::Serviços inativos após deploy"
  sudo systemctl status gestao-financeira-backend nginx mongod --no-pager || true
  sudo journalctl -u gestao-financeira-backend -n 30 --no-pager || true
  sudo journalctl -u mongod -n 30 --no-pager || true
fi
rm -f /tmp/release.tar.gz
if [ "$DEPLOY_OK" -eq 0 ]; then
  echo "::error::Deploy falhou; verifique logs na VM"
  exit 1
fi
