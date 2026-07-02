# SaaS Fase 2B — Planos e billing (Stripe)

**Status:** implementado  
**Última revisão:** 2026-07-02

## Objetivo

Monetizar o produto com assinaturas recorrentes via Stripe Checkout, limites por plano e bloqueio de acesso após trial expirado.

## Decisões

| Tópico | Decisão |
|--------|---------|
| Gateway | Stripe Checkout (hosted) + Customer Portal |
| Planos | `trial` (14 dias), `starter`, `pro` |
| Trial | Mantido da Fase 2A (`trialEndsAt`) |
| Aprovação manual | Mantida — checkout só após org `approved` |
| Bloqueio | Login negado se trial expirou sem assinatura ativa |
| `past_due` | Acesso mantido + banner de alerta |
| Demo local | Org `Empresa Demo` com `plan=pro`, `billingStatus=active` |

## Limites por plano

| Plano | Notas | Importações/mês |
|-------|-------|-----------------|
| Trial | 500 | 20 |
| Starter | 2.000 | 100 |
| Pro | Ilimitado | Ilimitado |

## Modelo (`Organization`)

Campos adicionados:

- `plan`, `billingStatus`
- `stripeCustomerId`, `stripeSubscriptionId`
- `currentPeriodEnd`, `planActivatedAt`

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/billing/plans` | Planos disponíveis |
| GET | `/api/billing/status` | Plano, uso, limites, acesso |
| POST | `/api/billing/checkout` | `{ plan: "starter" \| "pro" }` → URL Stripe |
| POST | `/api/billing/portal` | Portal do cliente Stripe |
| POST | `/api/billing/webhook` | Webhook Stripe (público, raw body) |

### Webhooks tratados

- `checkout.session.completed`
- `customer.subscription.updated` / `deleted`
- `invoice.payment_failed`

## Variáveis de ambiente

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
FRONTEND_URL=http://localhost:5173
```

## Configuração Stripe (dashboard)

1. Criar produtos **Starter** e **Pro** (recorrentes mensais)
2. Copiar Price IDs para `.env`
3. Configurar webhook apontando para `https://<api>/api/billing/webhook`
4. Habilitar Customer Portal em Billing → Settings

### Teste local com Stripe CLI

```bash
stripe listen --forward-to localhost:4000/api/billing/webhook
# Copiar whsec_... para STRIPE_WEBHOOK_SECRET
```

## Frontend

- Rota `/configuracoes/plano` — plano atual, uso, assinar, portal
- Banner no shell quando trial ≤ 7 dias ou pagamento `past_due`
- Item no menu **Análises → Plano e assinatura**

## Gate Fase 2B

- [x] Schema billing na Organization
- [x] Stripe Checkout + Portal + Webhooks
- [x] Limites de importação e notas manuais
- [x] Bloqueio pós-trial no login/refresh
- [x] UI de plano + banner
- [x] Testes unitários `organization-billing.util`
- [ ] E2E com Stripe test mode (opcional)

## Próxima fase

**2C** — Subdomínio / convites por organização (`docs/SAAS-FASE-2A.md`)
