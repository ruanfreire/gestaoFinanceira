# Gestão Financeira — Monorepo

Sistema de gestão financeira com arquitetura modular.

## Pastas

- `frontend/` — React + Vite + TypeScript (UI greenfield, design system próprio)
- `backend/` — NestJS + TypeScript API, MongoDB
- `scripts/` — orquestrador de desenvolvimento

## Como iniciar

1. Instalar dependências:

```bash
npm run install:all
```

2. Criar `.env` em `backend/` e `frontend/` conforme os `.env.example`.

3. Subir o ambiente:

```bash
npm run dev
```

## Comandos úteis

- Backend: `npm --workspace backend run dev`
- Seed admin: `npm --workspace backend run seed`
- Frontend: `npm --workspace frontend run dev`

## Credenciais padrão (após `npm --workspace backend run seed`)

Configure em `backend/.env`:

| Variável | Padrão |
|----------|--------|
| `SEED_SUPERADMIN_EMAIL` | `admin@fecho.local` |
| `SEED_SUPERADMIN_PASSWORD` | `fechoadmin@2026` |
| `SEED_ADMIN_PASSWORD` | `123456` (demais contas de dev) |

| Papel | E-mail | Destino |
|-------|--------|---------|
| SuperAdmin | `admin@fecho.local` | `/superadmin` |
| Admin | `admin@finance.local` | App — Empresa Demo |
| Client | `client@finance.local` | App — Empresa Demo |
| User | `user@finance.local` | App — Empresa Demo |
| Admin (2ª org) | `admin@acme.local` | App — Acme Consultoria |
| Client (2ª org) | `client@acme.local` | App — Acme Consultoria |
| Pendente | `pending@finance.local` | Login bloqueado |
| Rejeitado | `rejected@finance.local` | Login bloqueado |
| Suspenso | `suspended@finance.local` | Login bloqueado |

Para forçar atualização de senhas em contas já existentes: `SEED_RESET_PASSWORD=true`.
