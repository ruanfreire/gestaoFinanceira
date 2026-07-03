# Contas de desenvolvimento / seed

## Local (`npm run dev`)

| Papel | E-mail | Senha | Acesso |
|-------|--------|-------|--------|
| SuperAdmin | superadmin@finance.local | `123456` | `/superadmin` |
| Admin | admin@finance.local | `123456` | App (Empresa Demo) |
| Client | client@finance.local | `123456` | App (Empresa Demo) |
| User | user@finance.local | `123456` | App (Empresa Demo) |
| Admin 2ª org | admin@acme.local | `123456` | App (Acme) |
| Client 2ª org | client@acme.local | `123456` | App (Acme) |
| Pendente | pending@finance.local | `123456` | Bloqueado |
| Rejeitado | rejected@finance.local | `123456` | Bloqueado |
| Suspenso | suspended@finance.local | `123456` | Bloqueado |
| Trial | trial@finance.local | `123456` | App (trial 3 dias) |

Senha padrão: valor de `SEED_ADMIN_PASSWORD` no `backend/.env` (padrão `123456`).

## Massa de dados — Ruan Santana Ruh (conta real)

**Não cria usuário.** Popula notas e extratos na organização existente:

| Campo | Valor |
|-------|-------|
| E-mail | `ruanomaker@gmail.com` |
| Empresa | Ruan SantanaLTDA |
| Cadastro | 02/07/2026 |

```bash
# Local (usuário já deve existir no banco)
npm run seed:ruan --workspace backend

# Produção (na VM)
cd /opt/gestao-financeira/backend
set -a && source /opt/gestao-financeira/.env && set +a
npm run seed:ruan:prod
```

Inclui: **12 notas**, **10 lançamentos Asaas**, **3 Nubank**, **5 pendentes de vínculo**.

## Produção (`https://financeiro.seumovimento.com.br`)

- **E-mail:** `admin@finance.local`
- **Senha:** `123456` (após re-seed em 02/07/2026)
- A senha em produção vem de `SEED_ADMIN_PASSWORD` em `/opt/gestao-financeira/.env`

Para resetar senhas na VM:

```bash
cd /opt/gestao-financeira/backend
set -a && source /opt/gestao-financeira/.env && set +a
SEED_RESET_PASSWORD=true npm run seed:prod
```
