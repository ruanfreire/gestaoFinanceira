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

wait_for_mongod() {
  local i
  for i in $(seq 1 30); do
    if bash -c 'echo > /dev/tcp/127.0.0.1/27017' 2>/dev/null; then
      echo "==> MongoDB respondendo na porta 27017"
      return 0
    fi
    sleep 2
  done
  echo "==> ERRO: MongoDB não respondeu após reinício"
  sudo journalctl -u mongod -n 20 --no-pager || true
  return 1
}

wait_for_backend() {
  local i code
  for i in $(seq 1 20); do
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

wait_for_units_active() {
  local unit i state all_active
  for i in $(seq 1 30); do
    all_active=1
    for unit in gestao-financeira-backend nginx mongod; do
      state=$(systemctl is-active "$unit" 2>/dev/null || echo "unknown")
      if [[ "$state" != "active" ]]; then
        echo "==> Aguardando $unit (estado: $state)"
        all_active=0
        break
      fi
    done
    if [[ "$all_active" -eq 1 ]]; then
      echo "==> Todos os serviços ativos"
      return 0
    fi
    sleep 2
  done
  systemctl is-active gestao-financeira-backend nginx mongod || true
  return 1
}

run_pending_seed() {
  if [[ ! -f "$APP_DIR/.deploy/pending-seed" ]]; then
    return 0
  fi
  echo "==> Seed admin (pós-deploy)"
  rm -f "$APP_DIR/.deploy/pending-seed"
  if (cd "$APP_DIR/backend" && npm run seed:prod); then
    mkdir -p "$APP_DIR/.deploy"
    touch "$APP_DIR/.deploy/seed-done"
  else
    echo "==> AVISO: seed falhou; será tentado no próximo deploy"
    touch "$APP_DIR/.deploy/pending-seed"
  fi
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

ensure_services_up() {
  if systemctl list-unit-files 2>/dev/null | grep -q gestao-financeira-backend; then
    sudo cp "$APP_DIR/deploy/systemd/gestao-financeira-backend.service" /etc/systemd/system/
    sudo cp "$APP_DIR/deploy/systemd/mongod.service" /etc/systemd/system/
    sudo cp "$APP_DIR/deploy/mongodb/mongod.conf" /etc/mongod.conf
    sudo chmod 644 /etc/mongod.conf
    sudo chown -R mongod:mongod /var/lib/mongo /var/log/mongodb
    sudo systemctl daemon-reload
    sudo systemctl enable gestao-financeira-backend mongod nginx 2>/dev/null || true
    sudo systemctl reset-failed mongod 2>/dev/null || true
  fi

  sudo systemctl stop mongod 2>/dev/null || true
  sleep 2
  if ! systemctl is-active --quiet mongod 2>/dev/null; then
    echo "==> Iniciando MongoDB"
    sudo systemctl start mongod
  else
    echo "==> Reiniciando MongoDB (aplicar configuração)"
    sudo systemctl restart mongod
  fi
  wait_for_mongod

  echo "==> Iniciando backend"
  sudo systemctl restart gestao-financeira-backend
  wait_for_backend || true
  run_pending_seed

  if ! systemctl is-active --quiet nginx 2>/dev/null; then
    echo "==> Iniciando nginx"
    sudo systemctl start nginx
  else
    sudo systemctl reload nginx
  fi
}

cmd_off() {
  if ! command -v nginx >/dev/null 2>&1; then
    echo "==> nginx ausente; iniciando apenas backend e MongoDB"
    ensure_services_up
    sudo rm -f "$MAINT_FLAG" "$NGINX_BAK"
    return 0
  fi

  echo "==> Aplicando configuração de produção do nginx"
  sudo cp "$APP_DIR/deploy/nginx/native.conf" "$NGINX_CONF"
  if ! sudo nginx -t; then
    echo "==> AVISO: native.conf inválido; tentando backup anterior"
    if [[ -f "$NGINX_BAK" ]] && sudo cp "$NGINX_BAK" "$NGINX_CONF" && sudo nginx -t; then
      echo "==> Backup de nginx restaurado"
    else
      echo "==> ERRO: nginx -t falhou"
      return 1
    fi
  fi

  ensure_services_up
  sudo rm -f "$MAINT_FLAG" "$NGINX_BAK"
  echo "==> Modo manutenção DESATIVADO — sistema no ar"
  wait_for_units_active
}

cmd_force_off() {
  echo "==> Restauração forçada (recuperação de falha)"
  if ! cmd_off; then
    sudo cp "$APP_DIR/deploy/nginx/native.conf" "$NGINX_CONF" 2>/dev/null || true
    sudo cp "$APP_DIR/deploy/mongodb/mongod.conf" /etc/mongod.conf 2>/dev/null || true
    sudo chmod 644 /etc/mongod.conf 2>/dev/null || true
    sudo chown -R mongod:mongod /var/lib/mongo /var/log/mongodb 2>/dev/null || true
    sudo nginx -t 2>/dev/null || true
    sudo systemctl daemon-reload 2>/dev/null || true
    sudo systemctl enable gestao-financeira-backend mongod nginx 2>/dev/null || true
    sudo systemctl reset-failed mongod 2>/dev/null || true
    sudo systemctl restart mongod 2>/dev/null || true
    wait_for_mongod 2>/dev/null || sleep 5
    sudo systemctl restart gestao-financeira-backend 2>/dev/null || true
    sudo systemctl reload nginx 2>/dev/null || sudo systemctl start nginx 2>/dev/null || true
    sudo rm -f "$MAINT_FLAG" "$NGINX_BAK"
    sudo systemctl is-active gestao-financeira-backend nginx mongod 2>/dev/null || true
  fi
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
