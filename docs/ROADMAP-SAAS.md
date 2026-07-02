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
| **7** | Conciliação | 🔄 70% | **Em curso — Agente 02** |
| **8** | Relatórios | ⏳ | Bloqueado até Fase 7 estável |
| **9** | Otimizações | ⏳ | — |
| **10** | Hardening (A11y, segurança) | ⏳ | — |
| **11** | Testes finais | ⏳ | — |
| **12** | Deploy | ⏳ | — |

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

## Fase 7 — Testes e docs ⏳

- Testes de interface (Testing Library) por feature
- Testes de regressão de contrato API (mock)
- Atualizar `frontend/docs/*` alinhado ao DS

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
