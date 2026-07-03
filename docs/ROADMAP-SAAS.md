# Roadmap SaaS — Gestão Financeira

**Documentação oficial de domínio:** `docs/BDRE.md`  
**Design System:** `frontend/src/design-system/` (referência histórica `/UI`)  
**Restrição:** zero alteração em APIs, regras de negócio, importadores ou persistência.

> **Escopo deste documento:** reescrita do frontend do produto atual (single-tenant).  
> Não cobre multi-tenant, billing, planos ou self-signup — ver seção [Pós-roadmap](#pós-roadmap).

**Última revisão:** 2026-07-02

---

## Status das fases (governança 12 fases)

| Fase | Escopo | Status | Gate |
|------|--------|--------|------|
| **1** | Arquitetura base, DS, Shell | ✅ | Liberado |
| **2** | Autenticação | ✅ | Liberado |
| **3** | Dashboard | ✅ | Liberado |
| **4** | Notas | ✅ | Liberado |
| **5** | Importações | ✅ | Liberado |
| **6** | Extratos | ✅ | Liberado |
| **7** | Conciliação | ✅ | Liberado |
| **8** | Relatórios | ✅ | Liberado |
| **9** | Otimizações | ✅ | Liberado |
| **10** | Hardening (A11y, segurança) | ✅ | Liberado |
| **11** | Testes finais | ✅ | Liberado |
| **12** | Deploy | ✅ | Liberado |

---

## Fase 1 — Arquitetura base, DS, Shell ✅

- Atomic Design em `design-system/` (atoms → templates)
- `AppShell` + `MobileNav` + lazy routes (`lazy-routes.ts`)
- Features isoladas (`features/*`)
- Tokens, tipografia, espaçamentos (`tokens.css`)

## Fase 2 — Autenticação ✅

- `/auth/entrar` com `AuthTemplate`, `TaskGuide`, Zod, estados de erro
- `RequireAuth` + sessão em `localStorage`
- Redirect pós-login preserva destino (`state.from`)

## Fase 3 — Dashboard ✅

- KPIs, alertas, timeline, ações rápidas (`home-page.tsx`)
- `PeriodFilter`, skeleton, retry em erro

## Fase 4 — Notas ✅

- Lista com busca debounced, paginação, split view desktop
- Painel lateral (modal) + `ConfirmDialog` antes de desvincular
- Registro manual (`/notas/nova`)

## Fase 5 — Importações ✅

- Wizard JSON notas (selecionar → validar → prévia → importar → resultado)
- Histórico e detalhe de arquivo

## Fase 6 — Extratos ✅

- Wizard CSV Asaas/Nubank com preview
- Histórico e detalhe financeiro por banco

## Fase 7 — Conciliação ✅

**Objetivo:** experiência CRM — split view, fila de pendências, score visual, atalhos.

| Entrega | Status |
|---------|--------|
| Split view desktop (fila + painel) | ✅ `recebimentos-page.tsx` |
| Sheet mobile para detalhe | ✅ |
| `MatchScore` visual | ✅ `movimento-panel.tsx` |
| Lista de candidatas com score + busca debounced | ✅ |
| Atalhos teclado (↑↓ / j k) + Enter para confirmar | ✅ |
| `ConfirmDialog` antes de vincular | ✅ |
| `role="radiogroup"` nas candidatas | ✅ |
| Undo via toast + desvincular | ✅ |
| Onboarding primeira visita (conciliação) | ✅ |
| FAB “Próximo” no mobile | ✅ |

**APIs utilizadas (inalteradas):**
- `GET /extrato-{banco}/pendentes|sem-match`
- `GET /extrato-{banco}/lancamentos/:id/notas?q=`
- `POST /extrato-{banco}/vincular`
- `POST /extrato-nubank/lancamentos/:id/pagador`
- `POST /notas/desvincular-pagamento`

## Fase 8 — Relatórios ✅

| Entrega | Status |
|---------|--------|
| Situação das notas — KPIs, preview, export CSV | ✅ `analises-situacao-page.tsx` |
| Filtros: período, status pagamento, base data (pagamento/emissão) | ✅ |
| Fluxo de caixa — wizard + export Excel | ✅ `analises-fluxo-page.tsx` |
| Filtro `mes_competencia_nf` no export | ✅ |
| Config. padrões export (localStorage) | ✅ `analises-config-page.tsx` |

## Fase 9 — Otimizações ✅

| Entrega | Status |
|---------|--------|
| `VirtualList` + filas conciliação/notas (30+ itens) | ✅ |
| `DataTable` ordenável + virtualização desktop (50+ linhas) | ✅ |
| `PrefetchLink` no menu lateral e mobile | ✅ |
| `lazy-routes` compartilhado (router + prefetch) | ✅ |

## Fase 10 — Hardening ✅

| Entrega | Status |
|---------|--------|
| Helmet + ValidationPipe global | ✅ |
| Throttler (login 8/min, global 120/min) | ✅ |
| Swagger opcional (`SWAGGER_ENABLED=true`) | ✅ |
| `SkipToContent` + `prefers-reduced-motion` | ✅ |
| `AuthTemplate` respeita `useReducedMotion` (axe E2E) | ✅ |
| Auditoria WCAG automatizada | ✅ `e2e/a11y.spec.ts` + `docs/WCAG-AUDIT.md` |

## Fase 11 — Testes finais ✅

| Entrega | Status |
|---------|--------|
| Backend unit tests (Vitest) | ✅ 61 testes |
| Frontend unit tests (Vitest) | ✅ 25 testes |
| E2E Playwright (auth, smoke, API health) | ✅ |
| Gate axe WCAG 2 AA (critical/serious) | ✅ 8/8 E2E |
| `LoginDto` / `HealthController` specs | ✅ |
| `SkipToContent`, onboarding, undo specs | ✅ |

```bash
npm test          # unit
npm run build && npm run e2e   # gate completo
```

## Fase 12 — Deploy ✅

| Entrega | Status |
|---------|--------|
| CI: `npm test` + `npm run build` | ✅ job `test` |
| CI: `npm run e2e` com Mongo service | ✅ job `e2e` |
| `docs/RELEASE-CHECKLIST.md` | ✅ |
| Workflow `deploy-native.yml` (main) | ✅ |
| Cron backup Mongo (`deploy/setup-backup-cron.sh`) | ✅ |

---

## Princípios de decisão (UX)

| Lei / Heurística | Aplicação |
|------------------|-----------|
| Nielsen #1 Visibilidade | `TaskGuide`, toasts, contadores de fila |
| Hick | Uma decisão por tela na conciliação |
| Fitts | CTAs primários full-width no mobile |
| Jakob | Padrões Stripe/Linear (split view, side panel) |
| Miller | Máx. 5 candidatas visíveis; busca para mais |
| Tesler | Complexidade no sistema (match automático), não no usuário |
| Doherty | Feedback < 400ms (skeleton, optimistic onde seguro) |

---

## Definition of Done global

Uma fase só fecha quando:

1. `npm test` e `npm run build` passam sem erros
2. `npm run e2e` passa (inclui axe em telas críticas)
3. `docs/BDRE.md` permanece compatível (sem alteração de regras de negócio)
4. Dívida técnica registrada em `docs/TECH-DEBT.md` está zerada ou justificada

---

## Pendências fora do escopo das 12 fases

Itens conscientemente **não** bloqueantes do roadmap de frontend:

| Item | Prioridade | Notas |
|------|------------|-------|
| Teste manual leitor de tela (NVDA/VoiceOver) | Baixa | `docs/WCAG-AUDIT.md` |
| Contraste tema escuro (`.dark`) | Baixa | Tokens existem; tema não exposto na UI |
| “Esqueci senha” | — | Fora de escopo de API (`PRODUCT-SPEC.md`) |
| Boas-vindas primeira sessão no login | Baixa | Onboarding só na conciliação hoje |
| Focus trap no formulário de login | Baixa | Dialogs já usam Radix FocusScope |
| Checklist pós-deploy na VM | Operacional | `docs/RELEASE-CHECKLIST.md` — execução manual |

---

## Pós-roadmap

Evolução comercial SaaS:

| Fase | Escopo | Status |
|------|--------|--------|
| **2A** | Multi-tenant — Organization, `tenantId`, isolamento de queries | ✅ |
| **2B** | Planos e billing (Stripe) | ✅ |
| **2C** | Subdomínio / convites por org | ✅ |
| **2D** | RBAC por tenant | ✅ |

Detalhes: `docs/SAAS-FASE-2A.md`, `docs/SAAS-FASE-2B.md`, `docs/SAAS-FASE-2C.md`, `docs/SAAS-FASE-2D.md`

### Emissão de NF a partir de pagamento (planejado)

Fluxo **paralelo** ao de conciliação existente: tomadores → rascunho → emissão (opt-in Honest) → `applyPayment`.

| Fase | Escopo | Status |
|------|--------|--------|
| **EP-0** | Documentação + feature flag | ✅ |
| **EP-1** | Cadastro de tomadores | ✅ |
| **EP-2** | Sugestão de tomador em recebimentos | ✅ |
| **EP-3** | Rascunho local + vínculo (sem prefeitura) | ✅ |
| **EP-4** | Emissão real via Honest | ✅ |
| **EP-5** | Polish e rollout | ✅ |

Plano completo: **`docs/FLUXO-EMISSAO-PAGAMENTO.md`**

- Multi-tenant / isolamento por organização
- Planos, billing e self-signup
- Gestão de usuários e permissões por tenant
- Integrações bancárias além de CSV manual

Referência de produto detalhada: `docs/PRODUCT-SPEC.md`.
