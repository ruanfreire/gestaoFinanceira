# SaaS Fase 2D — RBAC por tenant

**Status:** implementado  
**Última revisão:** 2026-07-02

## Objetivo

Diferenciar permissões dentro da organização: proprietário vs operador.

## Papéis (`User.tenantRole`)

| Papel | Permissões |
|-------|------------|
| **owner** | Tudo + billing + equipe/convites |
| **operator** | Operações financeiras (notas, importações, conciliação, relatórios) |

## Implementação

- Campo `tenantRole` no `User` + JWT (`tenantRole` no access token)
- `TenantRolesGuard` + `@TenantRoles('owner')` em billing checkout/portal e org/invites
- Signup define `tenantRole: 'owner'`; convites definem o papel escolhido
- Fallback: usuários `admin` legados tratados como owner no guard
- UI: menu Plano/Equipe oculto para operadores; páginas protegidas com redirect

## Seeder

| Conta | tenantRole |
|-------|------------|
| admin@finance.local | owner |
| client@ / user@ | operator |
| admin@acme.local | owner |

## Gate

- [x] Schema `tenantRole`
- [x] Guard + proteção billing/org
- [x] UI owner-only
- [x] Seeder atualizado
