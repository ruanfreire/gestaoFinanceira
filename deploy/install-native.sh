#!/bin/bash
# Instalação/atualização nativa na VM (sem Docker) — otimizado para 1 GB RAM
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"
NODE_VERSION="${NODE_VERSION:-22.17.0}"
MONGODB_VERSION="${MONGODB_VERSION:-7.0.15}"
NGINX_VERSION="${NGINX_VERSION:-1.26.3}"
FIRST_INSTALL=false

if [[ ! -d "$APP_DIR/backend/dist" ]] || [[ ! -d "$APP_DIR/frontend/dist" ]]; then
  echo "Erro: backend/dist e frontend/dist são obrigatórios."
  exit 1
fi

cd "$APP_DIR"

if [[ ! -f /etc/systemd/system/gestao-financeira-backend.service ]]; then
  FIRST_INSTALL=true
fi

echo "==> Modo: $([ "$FIRST_INSTALL" = true ] && echo 'primeira instalação' || echo 'atualização')"

fix_nginx_app_permissions() {
  echo "==> Permissões para nginx ler o frontend"
  sudo chmod o+x "$APP_DIR" "$APP_DIR/frontend" "$APP_DIR/frontend/dist" 2>/dev/null || true
  sudo chmod -R o+rX "$APP_DIR/frontend/dist" 2>/dev/null || true
}

ensure_swap() {
  if swapon --show | grep -q /swapfile; then
    return
  fi
  echo "==> Swap 4G"
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
}

install_node_binary() {
  ARCH="linux-x64"
  TAR="node-v${NODE_VERSION}-${ARCH}.tar.xz"
  echo "==> Node.js v${NODE_VERSION} (binário oficial — sem dnf)"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/${TAR}" -o "/tmp/${TAR}"
  sudo rm -rf /usr/local/node
  sudo tar -xJf "/tmp/${TAR}" -C /usr/local/
  sudo mv "/usr/local/node-v${NODE_VERSION}-${ARCH}" /usr/local/node
  sudo ln -sf /usr/local/node/bin/node /usr/local/bin/node
  sudo ln -sf /usr/local/node/bin/npm /usr/local/bin/npm
  sudo ln -sf /usr/local/node/bin/npx /usr/local/bin/npx
  rm -f "/tmp/${TAR}"
  node -v
  sync
}

upgrade_node_if_needed() {
  if command -v node >/dev/null 2>&1; then
    MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
    if [[ "$MAJOR" -ge 22 ]]; then
      echo "==> Node já instalado: $(node -v)"
      return
    fi
    echo "==> Atualizando Node $(node -v) → v${NODE_VERSION}"
  fi
  install_node_binary
}

install_mongodb_binary() {
  if command -v mongod >/dev/null 2>&1; then
    echo "==> MongoDB já instalado"
    return
  fi
  TAR="mongodb-linux-x86_64-rhel90-${MONGODB_VERSION}.tgz"
  TAR_PATH="/tmp/${TAR}"
  echo "==> MongoDB ${MONGODB_VERSION} (binário oficial — sem dnf)"
  if [[ ! -f "$TAR_PATH" ]] || ! tar -tzf "$TAR_PATH" >/dev/null 2>&1; then
    curl -fsSL "https://fastdl.mongodb.org/linux/${TAR}" -o "$TAR_PATH"
  fi
  sudo rm -rf /usr/local/mongodb
  sudo mkdir -p /usr/local/mongodb
  sudo tar -xzf "$TAR_PATH" -C /usr/local/mongodb --strip-components=1
  sudo ln -sf /usr/local/mongodb/bin/mongod /usr/local/bin/mongod
  sudo chmod +x /usr/local/mongodb/bin/mongod

  sudo getent group mongod >/dev/null || sudo groupadd -r mongod
  sudo getent passwd mongod >/dev/null || sudo useradd -r -g mongod -s /bin/false -d /var/lib/mongo mongod
  sudo mkdir -p /var/lib/mongo /var/log/mongodb
  sudo chown -R mongod:mongod /var/lib/mongo /var/log/mongodb

  /usr/local/bin/mongod --version | head -1
  sync
}

install_nginx_rpm() {
  if command -v nginx >/dev/null 2>&1; then
    echo "==> nginx já instalado"
    return
  fi
  RPM="nginx-${NGINX_VERSION}-1.el9.ngx.x86_64.rpm"
  BASE="http://nginx.org/packages/rhel/9/x86_64/RPMS"
  echo "==> nginx ${NGINX_VERSION} (RPM direto — sem dnf)"
  curl -fsSL "${BASE}/${RPM}" -o "/tmp/${RPM}"
  sudo rpm -ivh "/tmp/${RPM}" 2>/dev/null || sudo rpm -Uvh --replacepkgs "/tmp/${RPM}"
  rm -f "/tmp/${RPM}"
  nginx -v
  sync
}

ensure_ssl_cert() {
  SSL_HOST_IP="${SSL_HOST_IP:-}"
  SSL_DOMAIN="${SSL_DOMAIN:-financeiro.seumovimento.com.br}"
  if [[ -z "$SSL_HOST_IP" ]]; then
    SSL_HOST_IP="$(curl -fsSL --max-time 5 ifconfig.me 2>/dev/null || true)"
  fi
  export SSL_HOST_IP SSL_DOMAIN

  if [[ -n "$SSL_DOMAIN" && "$SSL_DOMAIN" != "_" ]]; then
    if bash deploy/ssl/install-letsencrypt.sh; then
      return
    fi
    echo "==> Let's Encrypt falhou; usando certificado autoassinado"
  fi

  bash deploy/ssl/generate-selfsigned.sh
}

ssl_cert_needs_refresh() {
  local cert="${SSL_DIR:-/etc/nginx/ssl}/gestao-financeira.crt"
  [[ -f "$cert" ]] || return 0
  sudo openssl x509 -in "$cert" -noout -checkend "$((30 * 86400))" >/dev/null 2>&1 && return 1
  return 0
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
    code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/health 2>/dev/null || echo "000")
    if [[ "$code" == "200" ]]; then
      echo "==> Backend respondendo (health OK)"
      return 0
    fi
    sleep 3
  done
  echo "==> AVISO: backend não respondeu após reinício"
  sudo journalctl -u gestao-financeira-backend -n 20 --no-pager || true
  return 1
}

is_maintenance_active() {
  [[ -f /var/www/maintenance/.active ]]
}

needs_npm_ci() {
  local hash_file="$APP_DIR/.deploy/package-lock.sha256"
  local new_hash
  new_hash=$(sha256sum package-lock.json | awk '{print $1}')
  if [[ -f "$hash_file" ]] && [[ "$(cat "$hash_file")" == "$new_hash" ]] && [[ -d node_modules/argon2 ]]; then
    return 1
  fi
  return 0
}

enter_maintenance_if_needed() {
  if is_maintenance_active; then
    return 0
  fi
  if [[ "$FIRST_INSTALL" == true ]] || needs_npm_ci; then
    echo "==> Ativando manutenção (deploy pesado)"
    bash deploy/maintenance.sh on || true
  else
    echo "==> Deploy leve; API permanece no ar durante atualização"
  fi
}

run_npm_ci_if_needed() {
  local hash_file="$APP_DIR/.deploy/package-lock.sha256"
  local new_hash
  mkdir -p "$APP_DIR/.deploy"
  if ! needs_npm_ci; then
    echo "==> package-lock.json inalterado; pulando npm ci"
    return 0
  fi
  new_hash=$(sha256sum package-lock.json | awk '{print $1}')
  echo "==> Dependências Node (backend)"
  export NODE_OPTIONS="--max-old-space-size=256"
  npm ci --omit=dev --workspace backend --include-workspace-root
  echo "$new_hash" > "$hash_file"
}

sync_mongodb_config() {
  if ! command -v mongod >/dev/null 2>&1; then
    return 0
  fi
  echo "==> Sincronizando configuração do MongoDB"
  sudo cp deploy/mongodb/mongod.conf /etc/mongod.conf
  sudo chmod 644 /etc/mongod.conf
  sudo chown root:root /etc/mongod.conf
  sudo cp deploy/systemd/mongod.service /etc/systemd/system/
  sudo mkdir -p /var/lib/mongo /var/log/mongodb
  sudo chown -R mongod:mongod /var/lib/mongo /var/log/mongodb
  sudo systemctl daemon-reload
  sudo systemctl enable mongod 2>/dev/null || true
  sudo systemctl reset-failed mongod 2>/dev/null || true
}

if [ "$FIRST_INSTALL" = true ]; then
  ensure_swap
  install_node_binary
  install_nginx_rpm
  install_mongodb_binary

  sync_mongodb_config
  sudo systemctl enable --now mongod

  ensure_ssl_cert
  sudo cp deploy/nginx/native.conf /etc/nginx/conf.d/gestao-financeira.conf
  sudo rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
  sudo mkdir -p /var/run/nginx
  sudo chown nginx:nginx /var/run/nginx
  sudo nginx -t
  sudo systemctl enable nginx
  sudo systemctl reset-failed nginx 2>/dev/null || true
  sudo systemctl start nginx

  if systemctl is-active --quiet firewalld; then
    sudo firewall-cmd --permanent --add-service=ssh || true
    sudo firewall-cmd --permanent --add-service=http || true
    sudo firewall-cmd --permanent --add-service=https || true
    sudo firewall-cmd --reload || true
  fi

  if command -v getenforce >/dev/null 2>&1 && [[ "$(getenforce)" != "Disabled" ]]; then
    sudo setsebool -P httpd_can_network_connect 1 || true
  fi

  if [[ ! -f .env ]]; then
    echo "==> Criando .env"
    cp deploy/env.native.example .env
    JWT_ACCESS=$(openssl rand -hex 32)
    JWT_REFRESH=$(openssl rand -hex 32)
    INTEGRATIONS_SECRET=$(openssl rand -hex 32)
    SEED_PASS="${SEED_ADMIN_PASSWORD:-$(openssl rand -hex 8)}"
    sed -i "s/troque_por_um_segredo_forte/$JWT_ACCESS/" .env
    sed -i "s/troque_por_outro_segredo_forte/$JWT_REFRESH/" .env
    sed -i "s/troque_antes_do_primeiro_seed/$SEED_PASS/" .env
    sed -i "s/troque_por_segredo_integracoes/$INTEGRATIONS_SECRET/" .env
    if ! grep -q '^FRONTEND_URL=' .env; then
      APP_DOMAIN_VAL=$(grep '^APP_DOMAIN=' .env | cut -d= -f2- | tr -d '\r')
      if [[ -n "$APP_DOMAIN_VAL" ]]; then
        echo "FRONTEND_URL=https://${APP_DOMAIN_VAL}" >> .env
      fi
    fi
    echo "SEED_ADMIN_PASSWORD=$SEED_PASS"
    echo "Login: admin@finance.local"
    mkdir -p .deploy
    touch .deploy/pending-seed
  fi

  sudo cp deploy/systemd/gestao-financeira-backend.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable gestao-financeira-backend
else
  sudo cp deploy/systemd/gestao-financeira-backend.service /etc/systemd/system/
  sudo systemctl daemon-reload
fi

enter_maintenance_if_needed
ensure_swap
upgrade_node_if_needed
sync_mongodb_config

if [[ -f .env ]] && [[ ! -f .deploy/seed-done ]] && [[ ! -f .deploy/pending-seed ]]; then
  echo "==> Seed pendente detectado (.env sem seed concluído)"
  mkdir -p .deploy
  touch .deploy/pending-seed
fi

if is_maintenance_active; then
  echo "==> Modo manutenção ativo; serviços já parados"
else
  echo "==> Deploy leve; serviços permanecem ativos"
fi

run_npm_ci_if_needed
fix_nginx_app_permissions

echo "==> Finalizando instalação"
if [ "$FIRST_INSTALL" = true ] || ssl_cert_needs_refresh; then
  ensure_ssl_cert
else
  echo "==> Certificado SSL válido; pulando renovação"
fi

if is_maintenance_active; then
  echo "==> Serviços serão reiniciados ao desativar manutenção"
else
  sudo cp deploy/nginx/native.conf /etc/nginx/conf.d/gestao-financeira.conf
  sudo nginx -t
  if ! systemctl is-active --quiet mongod 2>/dev/null; then
    sudo systemctl start mongod
  fi
  wait_for_mongod
  sudo systemctl reload nginx
  sudo systemctl restart gestao-financeira-backend
  wait_for_backend || true
fi

echo "==> Deploy concluído ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
if [[ -x "$APP_DIR/deploy/setup-backup-cron.sh" ]]; then
  echo "==> Configurando cron de backup MongoDB"
  APP_DIR="$APP_DIR" bash "$APP_DIR/deploy/setup-backup-cron.sh" || echo "AVISO: cron de backup não configurado"
fi
if is_maintenance_active; then
  echo "==> Manutenção ativa; serviços serão verificados em maintenance.sh off"
else
  sudo systemctl is-active gestao-financeira-backend nginx mongod
fi
