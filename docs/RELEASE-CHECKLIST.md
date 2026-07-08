# Checklist de release — Gestão Financeira

Use antes de cada deploy em produção (`main` → GitHub Actions).

## Pré-deploy (local ou CI)

- [ ] `npm test` — backend + frontend passando
- [ ] `npm run build` — sem erros TypeScript/Vite
- [ ] Sem arquivos sensíveis no commit (`.env`, `*.key`, `inicial.json`)
- [ ] `FRONTEND_URL` ou `APP_DOMAIN` no `.env` da VM (convites e Stripe)

## Pós-deploy (VM)

- [ ] `curl -fsS https://<host>/api/health` → `ok: true`
- [ ] Login com usuário admin funciona
- [ ] `sudo systemctl status gestao-financeira-backend nginx mongod` → active
- [x] Cron de backup Mongo — `deploy/setup-backup-cron.sh` (automático no `install-native.sh`)
- [ ] **Módulos novos:** default desligado; piloto só via superadmin (`docs/SUPERADMIN-MODULOS.md`)
- [ ] Smoke **sem** módulo opcional: notas + extrato + recebimentos
- [ ] Se liberou módulo piloto: smoke Document Core / frete na org específica

## Rollback


1. `bash deploy/maintenance.sh on` na VM
2. Restaurar tarball anterior em `/opt/gestao-financeira`
3. `bash deploy/install-native.sh` + `bash deploy/maintenance.sh off`

## Variáveis opcionais

| Variável | Uso |
|----------|-----|
| `SWAGGER_ENABLED=true` | Expõe `/api/docs` (somente ambientes internos) |
| `INTEGRATIONS_WORKER_ENABLED` | Worker Honest no backend (`true` em produção) |
| `INTEGRATIONS_WORKER_INTERVAL_MS` | Intervalo do worker (prod: `300000` = 5 min) |
| `INTEGRATIONS_CRON_SECRET` | Segredo para `POST /api/integrations/worker/run` |
| `HONEST_REQUEST_TIMEOUT_MS` | Timeout por link Honest (prod: `45000`) |

### Integrações Honest (VM já em produção)

Se o `.env` foi criado antes desta feature, adicione em `/opt/gestao-financeira/.env`:

```env
INTEGRATIONS_WORKER_ENABLED=true
INTEGRATIONS_WORKER_INTERVAL_MS=300000
INTEGRATIONS_CRON_SECRET=<openssl rand -hex 32>
HONEST_REQUEST_TIMEOUT_MS=45000
```

Depois: `sudo systemctl restart gestao-financeira-backend`

### Emissão de NF a partir de pagamento

- [ ] Cadastrar tomadores em Configurações → Tomadores (ou importar das notas)
- [ ] Fluxo local: Recebimentos → sem nota → **Registrar nota para este recebimento**
- [ ] Emissão NFS-e: Configurações → **Emissão NFS-e** (API da prefeitura, não Honest)
- [ ] Honest (importação): credenciais do portal `https://honest.com.br` (não login do app)
- [ ] Dev: `cd backend && npm run test:honest` antes de conectar Honest em produção
- [ ] Ver `docs/OPERACIONAL-EMISSAO.md` e `docs/PREFEITURA-EMISSAO.md`

### Honest — variáveis por ambiente

| Ambiente | `HONEST_BROWSER_LOGIN` | `HONEST_KEYCLOAK_CLIENT_SECRET` |
|----------|------------------------|----------------------------------|
| Dev local (Windows/Mac) | `true` | opcional |
| VM / Docker | `false` | **obrigatório** |
