#!/bin/bash
# Instalação/atualização nativa na VM (sem Docker) — otimizado para 1 GB RAM
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"
NODE_VERSION="${NODE_VERSION:-20.19.2}"
FIRST_INSTALL=false

if [[ ! -d "$APP_DIR/backend/dist" ]] || [[ ! -d "$APP_DIR/frontend/dist" ]]; then
  echo "Erro: backend/dist e frontend/dist são obrigatórios."
  exit 1
fi

cd "$APP_DIR"

if ! systemctl list-unit-files 2>/dev/null | grep -q gestao-financeira-backend; then
  FIRST_INSTALL=true
fi

echo "==> Modo: $([ "$FIRST_INSTALL" = true ] && echo 'primeira instalação' || echo 'atualização')"

ensure_swap() {
  if swapon --show | grep -q /swapfile; then
    return
  fi
  echo "==> Swap 2G"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
}

install_node_binary() {
  if command -v node >/dev/null 2>&1; then
  MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
    if [[ "$MAJOR" -ge 20 ]]; then
      echo "==> Node já instalado: $(node -v)"
      return
    fi
  fi

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

install_mongodb() {
  if command -v mongod >/dev/null 2>&1; then
    echo "==> MongoDB já instalado"
    return
  fi
  echo "==> MongoDB 7 (apenas servidor — pacote mínimo)"
  sudo tee /etc/yum.repos.d/mongodb-org-7.repo >/dev/null <<'EOF'
[mongodb-org-7]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/7/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF
  sudo dnf install -y --setopt=install_weak_deps=False mongodb-org-server mongodb-org-shell
  sync
}

install_nginx() {
  if command -v nginx >/dev/null 2>&1; then
    echo "==> nginx já instalado"
    return
  fi
  echo "==> nginx"
  sudo dnf install -y --setopt=install_weak_deps=False nginx
  sync
}

if [ "$FIRST_INSTALL" = true ]; then
  ensure_swap
  install_node_binary
  install_nginx
  install_mongodb

  sudo cp deploy/mongodb/mongod.conf /etc/mongod.conf
  sudo systemctl enable --now mongod

  sudo cp deploy/nginx/native.conf /etc/nginx/conf.d/gestao-financeira.conf
  sudo rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
  sudo nginx -t
  sudo systemctl enable --now nginx

  if systemctl is-active --quiet firewalld; then
    sudo firewall-cmd --permanent --add-service=ssh || true
    sudo firewall-cmd --permanent --add-service=http || true
    sudo firewall-cmd --permanent --add-service=https || true
    sudo firewall-cmd --reload || true
  fi

  if [[ ! -f .env ]]; then
    echo "==> Criando .env"
    cp deploy/env.native.example .env
    JWT_ACCESS=$(openssl rand -hex 32)
    JWT_REFRESH=$(openssl rand -hex 32)
    SEED_PASS="${SEED_ADMIN_PASSWORD:-$(openssl rand -hex 8)}"
    sed -i "s/troque_por_um_segredo_forte/$JWT_ACCESS/" .env
    sed -i "s/troque_por_outro_segredo_forte/$JWT_REFRESH/" .env
    sed -i "s/troque_antes_do_primeiro_seed/$SEED_PASS/" .env
    echo "SEED_ADMIN_PASSWORD=$SEED_PASS"
    echo "Login: admin@finance.local"
  fi

  sudo cp deploy/systemd/gestao-financeira-backend.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable gestao-financeira-backend
fi

echo "==> Dependências Node (backend)"
export NODE_OPTIONS="--max-old-space-size=384"
npm ci --omit=dev --workspace backend --include-workspace-root

echo "==> Reiniciando serviços"
sudo cp deploy/nginx/native.conf /etc/nginx/conf.d/gestao-financeira.conf
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart gestao-financeira-backend

sleep 6

if [ "$FIRST_INSTALL" = true ]; then
  echo "==> Seed admin"
  (cd backend && npm run seed:prod) || true
fi

echo "==> Deploy concluído ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
sudo systemctl is-active gestao-financeira-backend nginx mongod
