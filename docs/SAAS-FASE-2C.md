# SaaS Fase 2C — Slug na URL e convites

**Status:** implementado  
**Última revisão:** 2026-07-02

## Objetivo

Identificar a organização na URL (`/:orgSlug/...`) e permitir convidar usuários para uma org existente.

## Decisões

| Tópico | Decisão |
|--------|---------|
| Roteamento | Path slug (`/empresa-demo/notas`) — subdomínio DNS fica para produção futura |
| Convite | Link com token (7 dias), sem e-mail SMTP na v1 |
| Aceite | `POST /auth/accept-invite` cria usuário na org (sem nova org) |
| Aprovação | Se org já `approved`, convidado entra direto |

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/orgs/resolve/:slug` | Público — nome/status da org |
| GET | `/api/auth/invite/:token` | Público — preview do convite |
| POST | `/api/auth/accept-invite` | Público — aceitar convite |
| GET | `/api/org/members` | Membros da org (owner) |
| GET | `/api/org/invites` | Convites pendentes (owner) |
| POST | `/api/org/invites` | Criar convite (owner) |
| DELETE | `/api/org/invites/:id` | Revogar convite (owner) |

## Frontend

- Rotas sob `/:orgSlug/*` com redirect de legado (`/notas` → `/empresa-demo/notas`)
- `/convite/:token` — aceitar convite
- `/configuracoes/equipe` — gestão de equipe (owner)
- `PrefetchLink` prefixa automaticamente com slug da org

## Próxima fase

**2D** — RBAC owner/operator (`docs/SAAS-FASE-2D.md`)
