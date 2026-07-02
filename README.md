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

## Credenciais padrão

- E-mail: `admin@finance.local`
- Senha: `123456` (ou `SEED_ADMIN_PASSWORD` no `.env` do backend)
