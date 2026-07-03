#!/bin/bash
# Instalação nativa (sem Docker) — Oracle Linux 9
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"

echo "==> Bootstrap nativo em $APP_DIR"

if [[ ! -d "$APP_DIR/backend/dist" ]] || [[ ! -d "$APP_DIR/frontend/dist" ]]; then
  echo "Erro: backend/dist e frontend/dist são obrigatórios. Rode native-install.ps1 no PC primeiro."
  exit 1
fi

cd "$APP_DIR"

# Swap
if ! swapon --show | grep -q /swapfile; then
  echo "==> Configurando swap 2G"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Node.js 20
if ! command -v node >/dev/null 2>&1 || [[ "$(node -p "process.versions.node.split('.')[0]")" -lt 20 ]]; then
  echo "==> Instalando Node.js 20"
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo dnf install -y nodejs
fi

# MongoDB 7
if ! command -v mongod >/dev/null 2>&1; then
  echo "==> Instalando MongoDB 7"
  sudo tee /etc/yum.repos.d/mongodb-org-7.repo >/dev/null <<'EOF'
[mongodb-org-7]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/7/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF
  sudo dnf install -y mongodb-org
fi

echo "==> Configurando MongoDB (cache reduzido)"
sudo cp deploy/mongodb/mongod.conf /etc/mongod.conf

sudo systemctl enable --now mongod

# nginx
if ! command -v nginx >/dev/null 2>&1; then
  echo "==> Instalando nginx"
  sudo dnf install -y nginx
fi

sudo cp deploy/nginx/native.conf /etc/nginx/conf.d/gestao-financeira.conf
sudo rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
sudo nginx -t
sudo systemctl enable --now nginx

# Firewall
if systemctl is-active --quiet firewalld; then
  echo "==> Liberando portas no firewalld"
  sudo firewall-cmd --permanent --add-service=ssh || true
  sudo firewall-cmd --permanent --add-service=http || true
  sudo firewall-cmd --permanent --add-service=https || true
  sudo firewall-cmd --reload || true
fi

# .env
if [[ ! -f .env ]]; then
  echo "==> Criando .env"
  cp deploy/env.native.example .env
  JWT_ACCESS=$(openssl rand -hex 32)
  JWT_REFRESH=$(openssl rand -hex 32)
  INTEGRATIONS_SECRET=$(openssl rand -hex 32)
  SEED_PASS=$(openssl rand -hex 8)
  sed -i "s/troque_por_um_segredo_forte/$JWT_ACCESS/" .env
  sed -i "s/troque_por_outro_segredo_forte/$JWT_REFRESH/" .env
  sed -i "s/troque_antes_do_primeiro_seed/$SEED_PASS/" .env
  sed -i "s/troque_por_segredo_integracoes/$INTEGRATIONS_SECRET/" .env
  echo ""
  echo "Senha admin (SEED_ADMIN_PASSWORD): $SEED_PASS"
  echo "Login: admin@finance.local"
fi

# Dependências de produção do backend (binários Linux)
echo "==> Instalando dependências Node (backend)"
export NODE_OPTIONS="--max-old-space-size=512"
npm ci --omit=dev --workspace backend --include-workspace-root

# systemd
echo "==> Configurando serviço systemd"
sudo cp deploy/systemd/gestao-financeira-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gestao-financeira-backend

echo "==> Aguardando API..."
sleep 8

echo "==> Seed do admin"
cd backend && npm run seed:prod || true

PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo "==> Deploy nativo concluído"
echo "    URL:  http://${PUBLIC_IP}"
echo "    API:  systemctl status gestao-financeira-backend"
echo "    Web:  systemctl status nginx"
echo "    DB:   systemctl status mongod"
