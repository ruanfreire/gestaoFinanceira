#!/bin/bash
# Modo manutenção: para serviços pesados e exibe página estática via nginx
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"
NGINX_CONF="/etc/nginx/conf.d/gestao-financeira.conf"
NGINX_BAK="/etc/nginx/conf.d/gestao-financeira.conf.production.bak"
MAINT_FLAG="/var/www/maintenance/.active"
MAINT_ROOT="/var/www/maintenance"

free_ram() {
  echo "==> Liberando RAM (backend + MongoDB)"
  sudo systemctl stop gestao-financeira-backend 2>/dev/null || true
  if systemctl is-active --quiet mongod 2>/dev/null; then
    sudo systemctl stop mongod
  fi
  sleep 2
  sync
  echo 3 | sudo tee /proc/sys/vm/drop_caches >/dev/null 2>&1 || true
  free -h
}

wait_for_backend() {
  local i code
  for i in 1 2 3 4 5 6 7 8 9 10; do
    code=$(curl -s -o /dev/null -w "%{http_code}" \
      http://127.0.0.1:4000/api/auth/login \
      -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
    if [[ "$code" =~ ^[245] ]]; then
      echo "==> Backend respondendo (HTTP $code)"
      return 0
    fi
    sleep 3
  done
  echo "==> AVISO: backend não respondeu após reinício"
  sudo journalctl -u gestao-financeira-backend -n 20 --no-pager || true
  return 1
}

cmd_on() {
  if ! command -v nginx >/dev/null 2>&1; then
    echo "==> nginx ausente (primeira instalação); apenas liberando RAM"
    free_ram
    return 0
  fi

  sudo mkdir -p "$MAINT_ROOT"
  sudo cp "$APP_DIR/deploy/nginx/maintenance.html" "$MAINT_ROOT/index.html"

  if [[ -f "$NGINX_CONF" ]] && ! grep -q "MAINTENANCE_MODE" "$NGINX_CONF" 2>/dev/null; then
    sudo cp "$NGINX_CONF" "$NGINX_BAK"
  fi

  sudo cp "$APP_DIR/deploy/nginx/maintenance.conf" "$NGINX_CONF"
  sudo nginx -t
  free_ram
  sudo systemctl reload nginx 2>/dev/null || sudo systemctl start nginx
  sudo touch "$MAINT_FLAG"
  echo "==> Modo manutenção ATIVO (página estática no ar)"
}

cmd_off() {
  if ! command -v nginx >/dev/null 2>&1; then
    echo "==> nginx ausente; pulando desativação"
    return 0
  fi

  if [[ -f "$NGINX_BAK" ]]; then
    sudo cp "$NGINX_BAK" "$NGINX_CONF"
  else
    sudo cp "$APP_DIR/deploy/nginx/native.conf" "$NGINX_CONF"
  fi
  sudo nginx -t

  if ! systemctl is-active --quiet mongod 2>/dev/null; then
    echo "==> Iniciando MongoDB"
    sudo systemctl start mongod
    sleep 3
  fi

  echo "==> Iniciando backend"
  sudo systemctl restart gestao-financeira-backend
  wait_for_backend || true

  sudo systemctl reload nginx
  sudo rm -f "$MAINT_FLAG" "$NGINX_BAK"
  echo "==> Modo manutenção DESATIVADO — sistema no ar"
}

cmd_force_off() {
  echo "==> Restauração forçada (recuperação de falha)"
  cmd_off || {
    sudo cp "$APP_DIR/deploy/nginx/native.conf" "$NGINX_CONF" 2>/dev/null || true
    sudo systemctl start mongod 2>/dev/null || true
    sudo systemctl restart gestao-financeira-backend 2>/dev/null || true
    sudo systemctl reload nginx 2>/dev/null || sudo systemctl start nginx 2>/dev/null || true
    sudo rm -f "$MAINT_FLAG" "$NGINX_BAK"
  }
}

cmd_status() {
  if [[ -f "$MAINT_FLAG" ]]; then
    echo "maintenance: active"
  else
    echo "maintenance: inactive"
  fi
  systemctl is-active gestao-financeira-backend nginx mongod 2>/dev/null || true
  free -h
}

usage() {
  echo "Uso: $0 {on|off|force-off|status}"
  exit 1
}

cd "$APP_DIR"
case "${1:-}" in
  on) cmd_on ;;
  off) cmd_off ;;
  force-off) cmd_force_off ;;
  status) cmd_status ;;
  *) usage ;;
esac
