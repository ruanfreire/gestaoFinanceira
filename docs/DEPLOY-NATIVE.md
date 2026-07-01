# Deploy nativo automático (GitHub Actions)

Deploy **sem Docker**: build no GitHub → SSH na VM Oracle → Node + MongoDB + nginx.

## Fluxo automático

```
git push main  →  testes  →  build  →  SCP para VM  →  install-native.sh
```

Workflow: `.github/workflows/deploy-native.yml`

---

## Configuração única (GitHub)

### 1. Subir o projeto no GitHub

```bash
git init
git add .
git commit -m "feat: deploy nativo automático"
git remote add origin https://github.com/SEU_USUARIO/GestaoFinanceira.git
git push -u origin main
```

### 2. Secrets (Settings → Secrets and variables → Actions)

| Secret | Valor | Obrigatório |
|--------|-------|-------------|
| `SSH_HOST` | `147.15.15.150` | Sim |
| `SSH_USER` | `opc` | Sim |
| `SSH_PRIVATE_KEY` | Conteúdo completo de `ssh/ssh-key-2026-07-01.key` | Sim |
| `DEPLOY_PATH` | `/opt/gestao-financeira` | Sim |
| `SSH_PORT` | `22` | Não |
| `SEED_ADMIN_PASSWORD` | Senha do admin inicial | Não (gerada automaticamente) |

**SSH_PRIVATE_KEY:** copie o arquivo inteiro, incluindo:

```
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

### 3. Primeiro deploy

- Faça **push na branch `main`**, ou
- Actions → **Deploy Native** → **Run workflow**

Acompanhe em **Actions** no GitHub.

Na primeira execução o script instala Node, MongoDB, nginx e cria o `.env`.  
A senha do admin aparece nos **logs do job** (`SEED_ADMIN_PASSWORD=...`) se não definir o secret.

---

## Deploy manual (sem GitHub)

```powershell
.\deploy\native-install.ps1 -HostIP "147.15.15.150"
```

---

## Arquitetura na VM

```
nginx :80  →  /opt/gestao-financeira/frontend/dist
          →  /api  →  systemd gestao-financeira-backend :4000
                         →  MongoDB 127.0.0.1:27017
```

---

## Comandos na VM

```bash
sudo systemctl status gestao-financeira-backend nginx mongod
sudo journalctl -u gestao-financeira-backend -f
nano /opt/gestao-financeira/.env
sudo systemctl restart gestao-financeira-backend
```

---

## Atualizações

Cada **push na `main`**:
1. Roda testes
2. Recompila backend e frontend
3. Envia para a VM
4. `npm ci --omit=dev` + restart dos serviços

**O `.env` na VM não é sobrescrito** em atualizações.

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| SSH falha no Actions | Security List porta 22; route table `rt-public` |
| `npm ci` OOM na VM | Swap ativo (`free -h`); workflow já usa `NODE_OPTIONS=512` |
| API não sobe | `journalctl -u gestao-financeira-backend -n 50` |
| Site em branco | `ls frontend/dist/index.html`; `nginx -t` |

---

## Arquivos

| Arquivo | Função |
|---------|--------|
| `.github/workflows/deploy-native.yml` | CI/CD automático |
| `deploy/install-native.sh` | Instala/atualiza na VM |
| `deploy/native-install.ps1` | Deploy manual do PC |
