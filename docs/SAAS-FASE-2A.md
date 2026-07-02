# SaaS Fase 2A — Multi-tenant (fundação)

**Status:** concluída (fundação)  
**Última revisão:** 2026-07-02

## Objetivo

Isolar dados financeiros por organização (tenant), mantendo regras de negócio e contratos de API inalterados na superfície.

## Decisões (defaults aprovados)

| Tópico | Decisão Fase 2A |
|--------|-----------------|
| Aprovação | Manual via SuperAdmin (usuário + organização) |
| Billing Stripe | Fase 2B (fora de 2A) |
| Subdomínio | Fase 2C — JWT carrega `tenantId` |
| Trial | 14 dias no cadastro (`trialEndsAt` na org) |
| Dados legados | Org padrão `Empresa Demo` + script `migrate:tenant` |

## Modelo de dados

- **`Organization`**: `name`, `slug`, `cnpj`, `status`, `ownerUserId`, `trialEndsAt`
- **`User.tenantId`**: referência à organização (null para `superadmin`)
- **`tenantId`** em: `notas`, `importacaos`, extratos Asaas/Nubank, `auditlogs`

## Isolamento

1. **JWT** inclui `tenantId` para usuários de tenant
2. **`TenantGuard`** bloqueia rotas de negócio sem tenant
3. **`TenantInterceptor`** + **AsyncLocalStorage** + **plugin Mongoose** filtram queries automaticamente
4. Rotas de plataforma usam `@SkipTenant()`

## Scripts

```bash
npm --workspace backend run seed          # superadmin + admin + org demo
npm --workspace backend run migrate:tenant # backfill tenantId em dados existentes
```

## Gate Fase 2A

- [x] Schema Organization + tenantId nos documentos de negócio
- [x] Signup cria Organization + User vinculado
- [x] SuperAdmin aprova/suspende org em cascata
- [x] JWT com tenantId
- [x] Plugin de isolamento em queries
- [x] Migração de dados legados
- [ ] Testes E2E com dois tenants (Fase 2A.1)
- [x] Billing / planos (Fase 2B — ver `docs/SAAS-FASE-2B.md`)

## Próximas fases

| Fase | Escopo |
|------|--------|
| **2B** | Planos, limites, Stripe Checkout |
| **2C** | Subdomínio / slug na URL, convites de usuário |
| **2D** | RBAC por tenant (owner, operator) |
