#!/bin/bash
# Aplica .env de produção na VM (stdin ou arquivo). Faz backup antes.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"
ENV_FILE="${APP_DIR}/.env"
SOURCE="${1:-}"

if [[ -n "$SOURCE" ]]; then
  if [[ ! -f "$SOURCE" ]]; then
    echo "::error::Arquivo não encontrado: $SOURCE"
    exit 1
  fi
  NEW_ENV="$SOURCE"
else
  NEW_ENV="$(mktemp)"
  trap 'rm -f "$NEW_ENV"' EXIT
  cat > "$NEW_ENV"
fi

if ! grep -q '^JWT_ACCESS_SECRET=' "$NEW_ENV" || ! grep -q '^MONGO_URI=' "$NEW_ENV"; then
  echo "::error::.env inválido: JWT_ACCESS_SECRET e MONGO_URI são obrigatórios"
  exit 1
fi

mkdir -p "$APP_DIR"
if [[ -f "$ENV_FILE" ]]; then
  cp "$ENV_FILE" "${ENV_FILE}.backup.$(date -u +%Y%m%dT%H%M%SZ)"
  echo "==> Backup: ${ENV_FILE}.backup.*"
fi

cp "$NEW_ENV" "$ENV_FILE"
chmod 600 "$ENV_FILE"

# Corrige valores críticos de produção (evita localhost/development após merge manual)
if grep -q '^APP_DOMAIN=' "$ENV_FILE"; then
  APP_DOMAIN_VAL=$(grep '^APP_DOMAIN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
  if [[ -n "$APP_DOMAIN_VAL" ]]; then
    PROD_FRONTEND="https://${APP_DOMAIN_VAL}"
    PROD_API="https://${APP_DOMAIN_VAL}/api"
    for pair in "NODE_ENV=production" "FRONTEND_URL=${PROD_FRONTEND}" "API_PUBLIC_URL=${PROD_API}" "HONEST_BROWSER_LOGIN=true"; do
      key="${pair%%=*}"
      val="${pair#*=}"
      if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
      else
        echo "${key}=${val}" >> "$ENV_FILE"
      fi
    done
  fi
fi

# Garante FRONTEND_URL se só APP_DOMAIN estiver definido
if ! grep -q '^FRONTEND_URL=' "$ENV_FILE" || grep -q '^FRONTEND_URL=$' "$ENV_FILE"; then
  APP_DOMAIN_VAL=$(grep '^APP_DOMAIN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)
  if [[ -n "$APP_DOMAIN_VAL" ]]; then
    if grep -q '^FRONTEND_URL=' "$ENV_FILE"; then
      sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://${APP_DOMAIN_VAL}|" "$ENV_FILE"
    else
      echo "FRONTEND_URL=https://${APP_DOMAIN_VAL}" >> "$ENV_FILE"
    fi
  fi
fi

echo "==> .env aplicado em $ENV_FILE ($(wc -l < "$ENV_FILE") linhas)"

if systemctl is-active --quiet gestao-financeira-backend 2>/dev/null; then
  echo "==> Reiniciando backend"
  sudo systemctl restart gestao-financeira-backend
  for i in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/health 2>/dev/null || echo "000")
    if [[ "$code" == "200" ]]; then
      echo "==> Health OK"
      exit 0
    fi
    sleep 2
  done
  echo "::warning::Backend não respondeu health após restart"
  sudo journalctl -u gestao-financeira-backend -n 15 --no-pager || true
fi
