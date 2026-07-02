# Roadmap SaaS — Gestão Financeira

**Documentação oficial de domínio:** `docs/BDRE.md`  
**Design System:** `frontend/src/design-system/` (referência histórica `/UI`)  
**Restrição:** zero alteração em APIs, regras de negócio, importadores ou persistência.

---

## Status das fases (alinhado governança 12 fases)

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

## Fase 1 — Fundação ✅

- Atomic Design em `design-system/` (atoms → templates)
- `AppShell` + `MobileNav` + lazy routes
- Features isoladas (`features/*`)
- Tokens, tipografia, espaçamentos

## Fase 2 — Operação inicial ✅

- Dashboard com KPIs, alertas, timeline, ações rápidas
- Auth com `TaskGuide`, validação Zod, estados de erro

## Fase 3 — Notas e importações ✅

- Wizard JSON (selecionar → validar → prévia → importar → resultado)
- `DataTable` com busca, paginação, painel lateral (modal)
- `ConfirmDialog` para ações destrutivas

## Fase 4 — Conciliação (prioridade atual) 🔄

**Objetivo:** experiência CRM — split view, fila de pendências, score visual, atalhos.

| Entrega | Status |
|---------|--------|
| Split view desktop (fila + painel) | 🔄 |
| Sheet mobile para detalhe | 🔄 |
| `MatchScore` visual | 🔄 |
| Lista de candidatas com score | 🔄 |
| Atalhos teclado (↑↓ navegar) | 🔄 |
| Undo via desvincular (notas) | ✅ existente |

**APIs utilizadas (inalteradas):**
- `GET /extrato-{banco}/pendentes|sem-match`
- `GET /extrato-{banco}/lancamentos/:id/notas?q=`
- `POST /extrato-{banco}/vincular`
- `POST /extrato-nubank/lancamentos/:id/pagador`

## Fase 5 — Relatórios e configurações ⏳

- Situação das notas: export CSV, filtros avançados
- Fluxo de caixa: wizard já implementado
- Tela de configurações (env overrides fluxo — somente UI sobre query params existentes)

## Fase 6 — Qualidade ⏳

- WCAG AA audit (contraste, focus, ARIA)
- Virtualização em tabelas grandes
- Prefetch de rotas críticas
- Bottom FAB conciliação no mobile

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

## Fase 11 — Testes finais ✅

| Entrega | Status |
|---------|--------|
| `LoginDto` validation spec | ✅ |
| `HealthController` spec | ✅ |
| `SkipToContent` UI test | ✅ |

## Fase 12 — Deploy ✅

| Entrega | Status |
|---------|--------|
| CI: `npm run build` no job de test | ✅ |
| `docs/RELEASE-CHECKLIST.md` | ✅ |
| Workflow `deploy-native.yml` (main) | ✅ existente |

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

Ver checklist em conversa de entrega; cada fase só fecha quando testes passam e BDRE permanece compatível.
