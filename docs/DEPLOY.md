# Deploy com Docker + GitHub Actions

> **Deploy nativo automático (recomendado — sem Docker):** [DEPLOY-NATIVE.md](./DEPLOY-NATIVE.md)  
> **Tutorial Oracle do zero:** [ORACLE-OCI-TUTORIAL.md](./ORACLE-OCI-TUTORIAL.md)

Este guia descreve o deploy com **Docker Compose** (alternativa; exige mais RAM na VM).

## Arquitetura

```
Internet :80
    └── web (nginx) ── /api/* ──► backend (NestJS :4000)
                                      └── mongo (:27017, rede interna)
```

O frontend usa `baseURL: /api` e o nginx faz proxy para o backend — mesma origem, cookies de sessão funcionam com `COOKIE_SAME_SITE=lax`.

## 1. Preparar a VM

Requisitos: Ubuntu 22.04+ **ou Oracle Linux 9** (como na OCI), Docker Engine e Docker Compose plugin.

### Ubuntu

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### Oracle Linux 9 (OCI)

Usuário SSH padrão: **`opc`** (não `ubuntu`).

```bash
# Swap (recomendado na E2.1.Micro — 1 GB RAM)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker
sudo dnf update -y
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker opc
newgrp docker

# Firewall (se firewalld estiver ativo)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

Conectar:

```bash
ssh -i ~/.ssh/oracle_gestao opc@SEU_IP
```

Abra a porta **80** (e **443** se for usar HTTPS depois) no firewall da cloud **e** no `firewalld` da VM (comandos acima).

## 2. Clonar o repositório no servidor

```bash
sudo mkdir -p /opt/gestao-financeira
sudo chown $USER:$USER /opt/gestao-financeira
git clone https://github.com/SEU_USUARIO/GestaoFinanceira.git /opt/gestao-financeira
cd /opt/gestao-financeira
```

## 3. Configurar variáveis de ambiente

```bash
cp deploy/env.production.example .env
nano .env
```

Preencha pelo menos:

- `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` (segredos fortes)
- `SEED_ADMIN_PASSWORD` (senha do admin inicial)
- Dados de exportação (`FLUXO_CAIXA_*`) conforme necessário

## 4. Login no GitHub Container Registry (GHCR)

Se o repositório for **privado**, o servidor precisa puxar imagens do GHCR:

```bash
echo SEU_PAT_COM_read_packages | docker login ghcr.io -u SEU_USUARIO --password-stdin
```

Crie um Personal Access Token com escopo `read:packages`.

## 5. Secrets no GitHub

Em **Settings → Secrets and variables → Actions**, cadastre:

| Secret | Descrição |
|--------|-----------|
| `SSH_HOST` | IP público da VM |
| `SSH_USER` | Usuário SSH (ex.: `ubuntu`) |
| `SSH_PRIVATE_KEY` | Chave privada SSH (conteúdo completo do `.pem`) |
| `SSH_PORT` | (opcional) Porta SSH, padrão 22 |
| `DEPLOY_PATH` | Caminho no servidor, ex.: `/opt/gestao-financeira` |
| `GHCR_TOKEN` | (opcional) PAT com `read:packages` para repo privado |

## 6. Primeiro deploy

**Opção A — build local na VM (antes do CI):**

```bash
docker compose up -d --build
docker compose exec backend npm run seed:prod
```

**Opção B — aguardar push na `main`:**

O workflow `.github/workflows/deploy.yml`:

1. Roda testes
2. Publica imagens em `ghcr.io/<usuario>/gestao-financeira-backend` e `...-web`
3. Conecta via SSH, faz `git pull` e `docker compose up -d`

Depois do primeiro deploy:

```bash
docker compose exec backend npm run seed:prod
```

Login padrão após seed: `admin@finance.local` + senha definida em `SEED_ADMIN_PASSWORD`.

## 7. HTTPS (recomendado em produção)

O `docker-compose.yml` expõe a porta 80. Para HTTPS você pode:

- Colocar **Caddy** ou **Traefik** na frente com Let's Encrypt
- Ou usar **nginx + certbot** no host apontando para `localhost:80`

Com HTTPS, mantenha `COOKIE_SAME_SITE=lax` no `.env`.

## Comandos úteis

```bash
# Logs
docker compose logs -f backend
docker compose logs -f web

# Atualizar manualmente (sem GitHub)
docker compose pull && docker compose up -d

# Parar tudo
docker compose down

# Backup MongoDB
docker compose exec mongo mongodump --archive=/data/db/backup.archive --db finance
```

## Testar localmente (antes de subir na cloud)

```bash
cp deploy/env.production.example .env
docker compose up -d --build
```

Acesse `http://localhost`.

## VM Oracle E2.1.Micro (1 GB RAM — AMD)

Use este perfil quando não conseguir ARM (`A1.Flex`) por falta de capacidade em São Paulo.

### Criar a instância

| Campo | Valor |
|-------|--------|
| Image | **Oracle Linux 9** (`Oracle-Linux-9.x`) ou Ubuntu 22.04 **x86_64** |
| Shape | `VM.Standard.E2.1.Micro` |
| OCPU / RAM | 1 / 1 GB (Always Free) |
| Subnet | `public` + **IP público** |
| Boot volume | 50 GB |
| Usuário SSH | `opc` (Oracle Linux) ou `ubuntu` (Ubuntu) |

### Swap obrigatório (antes do Docker)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### Subir com limites de memória

```bash
docker compose -f docker-compose.yml -f docker-compose.micro.yml up -d --build
docker compose exec backend npm run seed:prod
```

O arquivo `docker-compose.micro.yml` reduz o cache do MongoDB e limita RAM dos containers.

## Fluxo do CI/CD

```mermaid
flowchart LR
  push[Push main] --> test[Testes npm]
  test --> build[Build Docker]
  build --> ghcr[Push GHCR]
  ghcr --> ssh[SSH na VM]
  ssh --> up[docker compose up -d]
```
