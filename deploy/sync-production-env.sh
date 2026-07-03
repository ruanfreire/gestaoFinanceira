#!/bin/bash
# Sincroniza .env local → VM (Linux/macOS/Git Bash).
# Uso: bash deploy/sync-production-env.sh [arquivo.env]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${SSH_HOST:-147.15.15.150}"
USER="${SSH_USER:-opc}"
REMOTE_DIR="${DEPLOY_PATH:-/opt/gestao-financeira}"
KEY="${SSH_KEY:-$ROOT/ssh/ssh-key-2026-07-01.key}"

ENV_FILE="${1:-}"
if [[ -z "$ENV_FILE" ]]; then
  if [[ -f "$ROOT/deploy/.env.production" ]]; then
    ENV_FILE="$ROOT/deploy/.env.production"
  elif [[ -f "$ROOT/backend/.env" ]]; then
    ENV_FILE="$ROOT/backend/.env"
  else
    echo "Erro: informe o arquivo .env ou crie deploy/.env.production"
    exit 1
  fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: arquivo não encontrado: $ENV_FILE"
  exit 1
fi
if [[ ! -f "$KEY" ]]; then
  echo "Erro: chave SSH não encontrada: $KEY"
  exit 1
fi

SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30)
REMOTE_SCRIPT="/tmp/apply-production-env.sh"

scp "${SSH_OPTS[@]}" "$ROOT/deploy/apply-production-env.sh" "${USER}@${HOST}:${REMOTE_SCRIPT}"
ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" "chmod +x ${REMOTE_SCRIPT}"
ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" "export APP_DIR='${REMOTE_DIR}'; bash ${REMOTE_SCRIPT}" < "$ENV_FILE"

echo "==> .env sincronizado: $ENV_FILE → ${USER}@${HOST}:${REMOTE_DIR}/.env"
