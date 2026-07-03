#!/bin/bash
# Bootstrap Oracle Linux 9 — Gestão Financeira
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.micro.yml"

echo "==> Bootstrap em $APP_DIR"

if [[ ! -d "$APP_DIR" ]]; then
  echo "Diretório $APP_DIR não existe. Copie o projeto antes de rodar este script."
  exit 1
fi

cd "$APP_DIR"

# Swap (1 GB RAM)
if ! swapon --show | grep -q /swapfile; then
  echo "==> Configurando swap 2G"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Instalando Docker"
  sudo dnf install -y git curl
  if ! curl -fsSL https://get.docker.com | sudo sh; then
    sudo dnf install -y dnf-plugins-core
    sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo || true
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  fi
  sudo systemctl enable --now docker
  sudo usermod -aG docker opc
fi

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
  echo "==> Criando .env a partir do exemplo"
  cp deploy/env.production.example .env
  JWT_ACCESS=$(openssl rand -hex 32)
  JWT_REFRESH=$(openssl rand -hex 32)
  INTEGRATIONS_SECRET=$(openssl rand -hex 32)
  SEED_PASS=$(openssl rand -hex 8)
  sed -i "s/troque_por_um_segredo_forte/$JWT_ACCESS/" .env
  sed -i "s/troque_por_outro_segredo_forte/$JWT_REFRESH/" .env
  sed -i "s/troque_antes_do_primeiro_seed/$SEED_PASS/" .env
  sed -i "s/troque_por_segredo_integracoes/$INTEGRATIONS_SECRET/" .env
  echo ""
  echo "Senha admin inicial (SEED_ADMIN_PASSWORD): $SEED_PASS"
  echo "Salve essa senha — login: admin@finance.local"
fi

echo "==> Build e start dos containers"
docker compose $COMPOSE_FILES up -d --build

echo "==> Aguardando backend..."
sleep 15

echo "==> Seed do usuário admin"
docker compose exec -T backend npm run seed:prod || true

echo ""
echo "==> Concluído. Acesse http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
docker compose ps
