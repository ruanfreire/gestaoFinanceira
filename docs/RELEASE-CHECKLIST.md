# Checklist de release — Gestão Financeira

Use antes de cada deploy em produção (`main` → GitHub Actions).

## Pré-deploy (local ou CI)

- [ ] `npm test` — backend + frontend passando
- [ ] `npm run build` — sem erros TypeScript/Vite
- [ ] Sem arquivos sensíveis no commit (`.env`, `*.key`, `inicial.json`)

## Pós-deploy (VM)

- [ ] `curl -fsS https://<host>/api/health` → `ok: true`
- [ ] Login com usuário admin funciona
- [ ] `sudo systemctl status gestao-financeira-backend nginx mongod` → active
- [x] Cron de backup Mongo — `deploy/setup-backup-cron.sh` (automático no `install-native.sh`)

## Rollback

1. `bash deploy/maintenance.sh on` na VM
2. Restaurar tarball anterior em `/opt/gestao-financeira`
3. `bash deploy/install-native.sh` + `bash deploy/maintenance.sh off`

## Variáveis opcionais

| Variável | Uso |
|----------|-----|
| `SWAGGER_ENABLED=true` | Expõe `/api/docs` (somente ambientes internos) |
