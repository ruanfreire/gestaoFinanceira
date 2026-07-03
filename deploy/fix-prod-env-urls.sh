#!/bin/bash
# Corrige URLs e NODE_ENV na VM sem reenviar o .env completo.
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/gestao-financeira}"
ENV_FILE="${APP_DIR}/.env"
DOMAIN="${APP_DOMAIN:-financeiro.seumovimento.com.br}"

cp "$ENV_FILE" "${ENV_FILE}.backup.$(date -u +%Y%m%dT%H%M%SZ)"
for pair in \
  "NODE_ENV=production" \
  "APP_DOMAIN=${DOMAIN}" \
  "FRONTEND_URL=https://${DOMAIN}" \
  "API_PUBLIC_URL=https://${DOMAIN}/api" \
  "HONEST_BROWSER_LOGIN=true"; do
  key="${pair%%=*}"
  val="${pair#*=}"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
done
echo "==> .env corrigido"
grep -E '^(NODE_ENV|APP_DOMAIN|FRONTEND_URL|API_PUBLIC|HONEST_BROWSER)' "$ENV_FILE"
sudo systemctl restart gestao-financeira-backend
sleep 6
curl -s -o /dev/null -w "health:%{http_code}\n" http://127.0.0.1:4000/api/health
