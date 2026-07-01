# Tutorial completo — Oracle Cloud Always Free + Gestão Financeira

Guia do zero: conta Oracle → rede → VM → Docker → sistema no ar.

**Região usada neste exemplo:** Brazil East (Sao Paulo) — `sa-saopaulo-1`  
**Shape recomendada quando ARM não está disponível:** `VM.Standard.E2.1.Micro` (1 GB RAM)  
**Sistema operacional:** Oracle Linux 9

---

## O que vamos ter no final

```
Internet
   │
   ▼
VM Oracle (IP público) :80
   └── Docker Compose
         ├── web (nginx + React)
         ├── backend (NestJS)
         └── mongo (banco de dados)
```

Acesso: `http://SEU_IP`  
Login admin: `admin@finance.local` + senha definida no `.env`

---

## Parte 0 — Pré-requisitos

### 0.1 Conta Oracle Cloud

1. Acesse [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. Crie a conta (cartão só para verificação; Always Free não cobra dentro dos limites)
3. Escolha **Home Region:** `Brazil East (Sao Paulo)` — **não dá para mudar depois**

### 0.2 Gerar chave SSH no seu PC (Windows)

No PowerShell:

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\oracle_gestao -N '""'
Get-Content $env:USERPROFILE\.ssh\oracle_gestao.pub
```

Copie o conteúdo do `.pub` — você vai colar na Oracle ao criar a VM.

> Se a Oracle gerou o par de chaves no console, baixe o `.key` e guarde em local seguro (ex.: pasta `ssh/` do projeto, **sem commitar** no Git).

---

## Parte 1 — Rede (VCN) — faça ANTES da instância

A ordem importa. Erro comum: criar VM sem rota para internet → SSH dá **timeout**.

### Visão da rede

```
VCN Neca (10.0.0.0/16)
├── Internet Gateway (igw-neca)
├── Route Table rt-public
│     └── 0.0.0.0/0 → Internet Gateway
├── Subnet public (10.0.0.0/24) — Public Subnet
│     └── usa rt-public
└── Security List — portas 22, 80, 443
```

### 1.1 Criar a VCN (se ainda não existir)

Menu ☰ → **Networking** → **Virtual cloud networks** → **Create VCN**

| Campo | Valor |
|-------|--------|
| Name | `Neca` (ou outro nome) |
| IPv4 CIDR | `10.0.0.0/16` |
| Use wizard | **VCN with Internet Connectivity** (se disponível) |

Se o wizard criar tudo automaticamente, pule para a **Parte 1.4** e confira as regras.

### 1.2 Internet Gateway

**VCN Neca** → aba **Gateways** → **Internet Gateways** → **Create**

| Campo | Valor |
|-------|--------|
| Name | `igw-neca` |

Aguarde status **Available**.

> **Importante:** a route table **associada ao Internet Gateway** deve ficar **vazia**. Não adicione `0.0.0.0/0` nela — dá erro *"must use private IP as a target"*.

### 1.3 Route Table da subnet (onde vai a rota 0.0.0.0/0)

**VCN Neca** → aba **Routing** → **Route Tables** → **Create Route Table**

| Campo | Valor |
|-------|--------|
| Name | `rt-public` |

**Add Route Rules:**

| Destination | Target Type | Target |
|-------------|-------------|--------|
| `0.0.0.0/0` | **Internet Gateway** | `igw-neca` |

**Create**

### 1.4 Subnet pública

**VCN Neca** → aba **Subnets** → **Create Subnet**

| Campo | Valor |
|-------|--------|
| Name | `public` |
| Subnet Type | **Regional** |
| IPv4 CIDR | `10.0.0.0/24` |
| Subnet Access | **Public Subnet** |
| Route Table | **`rt-public`** (não a Default vazia) |
| Security List | Default Security List |

**Create Subnet**

Se a subnet já existir: **Edit** → altere **Route Table** para `rt-public`.

### 1.5 Security List (firewall da cloud)

**VCN Neca** → aba **Security** → **Security Lists** → **Default Security List** → **Add Ingress Rules**

Adicione (além da regra SSH que pode já existir):

| Source CIDR | Protocol | Destination port | Descrição |
|-------------|----------|------------------|-----------|
| `0.0.0.0/0` | TCP | **22** | SSH |
| `0.0.0.0/0` | TCP | **80** | HTTP (app) |
| `0.0.0.0/0` | TCP | **443** | HTTPS (futuro) |

**Egress** pode permanecer liberando todo tráfego de saída (padrão).

### 1.6 Checklist de rede (antes de criar a VM)

```
[ ] Internet Gateway igw-neca → Available
[ ] rt-public com 0.0.0.0/0 → Internet Gateway
[ ] Subnet public → Public Subnet + Route Table rt-public
[ ] Security List → portas 22, 80, 443
[ ] Route table do IGW → vazia (sem regras)
```

---

## Parte 2 — Criar a instância (VM)

Menu ☰ → **Compute** → **Instances** → **Create instance**

### 2.1 Configuração básica

| Campo | Valor |
|-------|--------|
| Name | `gestao-financeira` |
| Compartment | `ananeca (root)` (ou o seu) |

### 2.2 Image

| Campo | Valor |
|-------|--------|
| Operating system | **Oracle Linux 9** |
| Image | `Oracle-Linux-9.x` (x86_64) |

### 2.3 Shape

Tente primeiro ARM (melhor performance):

| Shape | OCPU | RAM | Observação |
|-------|------|-----|------------|
| `VM.Standard.A1.Flex` | 1 | 6 GB | Pode dar *Out of capacity* em SP |
| `VM.Standard.E2.1.Micro` | 1 | 1 GB | AMD — quase sempre disponível |

Para **E2.1.Micro:** use imagem **x86_64**, não aarch64.

### 2.4 Networking

| Campo | Valor |
|-------|--------|
| Virtual cloud network | `Neca` |
| Subnet | `public` |
| **Assign a public IPv4 address** | **Marcado** |

### 2.5 SSH keys

Cole sua chave pública (`oracle_gestao.pub` ou a gerada pela Oracle).

### 2.6 Boot volume

| Campo | Valor |
|-------|--------|
| Custom boot volume size | **50 GB** |

### 2.7 Create

Aguarde **State: Running**. Anote o **Public IP** (ex.: `147.15.15.150`).

---

## Parte 3 — Testar SSH

No PowerShell (ajuste o caminho da chave):

```powershell
ssh -i "C:\caminho\para\ssh-key.key" opc@SEU_IP
```

Usuário **Oracle Linux:** `opc`  
Usuário **Ubuntu:** `ubuntu`

### Se der timeout

| Causa provável | Solução |
|----------------|---------|
| Route table sem IGW | Parte 1.3 — `rt-public` com `0.0.0.0/0` |
| Subnet sem route table correta | Subnet `public` → `rt-public` |
| Porta 22 bloqueada | Security List — ingress TCP 22 |
| Rota no IGW (errado) | Deixe route table do IGW vazia |

---

## Parte 4 — Preparar o servidor

Conectado via SSH como `opc`:

### 4.1 Swap (obrigatório na VM de 1 GB)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### 4.2 Docker

```bash
sudo dnf update -y
sudo dnf install -y dnf-plugins-core git
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker opc
newgrp docker
```

Se `dnf install docker-ce` falhar:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker opc
```

### 4.3 Firewall na VM

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## Parte 5 — Deploy do Gestão Financeira

### Opção A — Script automático do seu PC (Windows)

No PC, na pasta do projeto:

```powershell
cd "C:\Users\ruanf\OneDrive\Área de Trabalho\GestaoFinanceira"
.\deploy\remote-install.ps1 -HostIP "SEU_IP"
```

O script envia o código, cria `.env` com segredos aleatórios e sobe os containers.

### Opção B — Manual na VM

```bash
sudo mkdir -p /opt/gestao-financeira
sudo chown opc:opc /opt/gestao-financeira
cd /opt/gestao-financeira

# Se o projeto estiver no GitHub:
git clone https://github.com/SEU_USUARIO/GestaoFinanceira.git .

# Configurar ambiente
cp deploy/env.production.example .env
nano .env   # JWT secrets, SEED_ADMIN_PASSWORD, FLUXO_CAIXA_*

# Subir (perfil para 1 GB RAM)
docker compose -f docker-compose.yml -f docker-compose.micro.yml up -d --build

# Criar usuário admin
docker compose exec backend npm run seed:prod
```

### Variáveis mínimas no `.env`

```env
MONGO_URI=mongodb://mongo:27017/finance
NODE_ENV=production
COOKIE_SAME_SITE=lax
JWT_ACCESS_SECRET=<segredo-forte>
JWT_REFRESH_SECRET=<outro-segredo>
SEED_ADMIN_PASSWORD=<senha-do-admin>
```

---

## Parte 6 — Primeiro acesso

1. Abra no navegador: `http://SEU_IP`
2. Login: `admin@finance.local`
3. Senha: valor de `SEED_ADMIN_PASSWORD` no `.env`

### Comandos úteis

```bash
cd /opt/gestao-financeira
docker compose ps
docker compose logs -f backend
docker compose logs -f web
docker compose restart
docker compose down
```

---

## Parte 7 — Deploy automático via GitHub (opcional)

Depois que o manual funcionar, configure CI/CD:

1. Suba o projeto para o GitHub
2. Em **Settings → Secrets → Actions**, cadastre:
   - `SSH_HOST` = IP público
   - `SSH_USER` = `opc`
   - `SSH_PRIVATE_KEY` = conteúdo da chave privada
   - `DEPLOY_PATH` = `/opt/gestao-financeira`
3. Push na branch `main` dispara `.github/workflows/deploy.yml`

Detalhes em [DEPLOY.md](./DEPLOY.md).

---

## Parte 8 — HTTPS com domínio (opcional, depois)

1. Aponte o DNS do domínio para o IP público da VM
2. Use Caddy ou Certbot na VM
3. Mantenha `COOKIE_SAME_SITE=lax` no `.env`

---

## Troubleshooting

### Out of capacity (ARM A1)

- Tente **1 OCPU / 6 GB** em vez de 2 / 12
- Tente de madrugada (horário BR)
- Upgrade **Pay As You Go** (Always Free continua grátis)
- Use **E2.1.Micro** (AMD, 1 GB) + `docker-compose.micro.yml`

### SSH timeout

- Confira Parte 1 (rede) — quase sempre é route table ou Security List

### Erro na route table: *must use private IP*

- Você está na route table **do Internet Gateway** — errado
- Crie `rt-public` na aba **Routing** e associe à subnet `public`

### App não abre no navegador

- Security List: portas 80 e 443
- `firewalld` na VM: `http` e `https`
- `docker compose ps` — todos **Up**?

### Login não funciona

- Rode `docker compose exec backend npm run seed:prod`
- Confira `COOKIE_SAME_SITE=lax` no `.env`

### VM ociosa removida pela Oracle

Always Free pode reclamar VMs com uso &lt; 20% por 7 dias. Com o app rodando, isso não costuma ocorrer.

---

## Checklist final

```
CONTA
[ ] Oracle Cloud criada (São Paulo)

REDE
[ ] VCN Neca (10.0.0.0/16)
[ ] Internet Gateway igw-neca
[ ] Route table rt-public → 0.0.0.0/0 → IGW
[ ] Subnet public (10.0.0.0/24, Public)
[ ] Security List: 22, 80, 443

VM
[ ] Instância Running com IP público
[ ] SSH funciona (opc@IP)

SERVIDOR
[ ] Swap 2 GB
[ ] Docker instalado
[ ] firewalld: http/https

APP
[ ] .env configurado
[ ] docker compose up (com micro.yml se 1 GB)
[ ] seed:prod executado
[ ] http://IP abre o login
```

---

## Referência rápida — seu ambiente

| Item | Valor típico |
|------|----------------|
| VCN | Neca — `10.0.0.0/16` |
| Subnet | public — `10.0.0.0/24` |
| Route table | rt-public |
| Usuário SSH | opc |
| Shape | VM.Standard.E2.1.Micro |
| SO | Oracle Linux 9 |
| App na VM | `/opt/gestao-financeira` |
