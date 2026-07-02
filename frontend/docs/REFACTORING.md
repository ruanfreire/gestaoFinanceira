# Reescrita do Frontend — Gestão Financeira

Documento da refatoração arquitetural do frontend.  
**Status:** concluída (fases 0–12). Fonte de componentes: `frontend/src/design-system/`.  
**Roadmap operacional:** `docs/ROADMAP-SAAS.md` · **Última revisão:** 2026-07-02

---

## Objetivos

- Reorganizar arquitetura por **features**
- Melhorar UX (loading, skeleton, empty state, toasts, confirmações)
- Eliminar código duplicado entre páginas
- Manter **100% de compatibilidade** com o backend existente
- Tornar o projeto escalável e de fácil manutenção

## Stack (mantida)

| Tecnologia | Uso |
|------------|-----|
| React 18 | UI |
| Vite 6 | Build |
| TypeScript 5.7 | Tipagem |
| Tailwind 4 | Estilos (`design-system/tokens.css`) |
| React Router 6 | Rotas |
| Axios | HTTP (`lib/api-client.ts`) |
| TanStack Query | Cache e estado servidor |

## Estrutura alvo

```
frontend/src/
├── app/                 # Bootstrap, providers, router, PageTitleSync
├── design-system/       # Atoms, molecules, organisms, templates, tokens
├── features/            # Domínios (auth, notas, recebimentos, arquivos, analises, home)
└── lib/                 # API, rotas, formatação, page-titles, motion
```

## Mapa de rotas (atual)

| Rota | Feature | Página |
|------|---------|--------|
| `/auth/entrar` | `features/auth` | Login |
| `/auth/signin` | — | Redirect → `/auth/entrar` |
| `/` | `features/home` | Dashboard |
| `/notas` | `features/notas` | Lista + detalhe |
| `/notas/nova` | `features/notas` | Registrar nota |
| `/recebimentos` | `features/recebimentos` | Pendentes de confirmação |
| `/recebimentos/sem-correspondencia` | `features/recebimentos` | Pagamentos sem nota |
| `/arquivos/notas` | `features/arquivos` | Wizard JSON |
| `/arquivos/extratos` | `features/arquivos` | Wizard CSV |
| `/arquivos/historico` | `features/arquivos` | Histórico (tabs) |
| `/arquivos/historico/notas/:id` | `features/arquivos` | Detalhe importação NF |
| `/arquivos/historico/extratos/:banco/:id` | `features/arquivos` | Detalhe extrato |
| `/analises/situacao` | `features/analises` | Situação + CSV |
| `/analises/fluxo-caixa` | `features/analises` | Export Excel |
| `/analises/configuracoes` | `features/analises` | Padrões export (localStorage) |

> Rotas legadas (`/importacoes`, `/conciliacao`, `/relatorios`) foram substituídas na reescrita greenfield.

## Fases de migração

### Fase 0 — Fundação ✅

- [x] Documentação (`docs/REFACTORING.md`, `docs/UI-COMPONENTS.md`)
- [x] Alias `@ui` e `@` no TypeScript e Vite
- [x] TanStack Query (`@tanstack/react-query`)
- [x] `shared/services/api.client.ts`
- [x] `app/providers.tsx`, `app/router.tsx`, `app/App.tsx` (lazy loading)
- [x] Componentes UI: `Spinner`, `Skeleton`, `EmptyState`, `Pagination`, `Toast`, `ConfirmDialog`, `DropZone`
- [x] Shared: `PageHeader`, `FilterBar`, `DataTable`, `useConfirm`, `PageLoader`

### Fase 1 — Layout e Auth ✅

- [x] `features/auth/` — `auth.service`, `AuthContext`, `useAuth`, `SignInPage`, `RequireAuth`, `UserMenu`
- [x] Login via `api.client` (axios) com validação, alertas, mostrar senha, lembrar e-mail
- [x] `layouts/` — `AppShell`, `AppSidebar`, `AppHeader`, `navigation.ts` (menu agrupado)
- [x] `RouteBreadcrumb` no layout (todas as rotas mapeadas)
- [x] `Button` evoluído com `type="submit"`
- [x] Re-exports de compatibilidade removidos (`layout/`, `components/auth`, `pages/`)

### Fase 2 — Dashboard executivo ✅

- [x] `features/dashboard/` — `dashboard.service`, `useDashboardQuery`, `DashboardPage`
- [x] KPIs: valor NF, recebido, em aberto, conciliação (pendentes + sem match)
- [x] Gráficos ApexCharts (`FinanceAreaChart`, `FinanceBarChart` em `/UI`)
- [x] Importações recentes (faturas + extratos)
- [x] Movimentações pendentes de conciliação
- [x] Painel de alertas com links de ação
- [x] `MetricCard` reutilizável em `/UI`
- [x] Rota `/` migrada para `features/dashboard/pages/DashboardPage.tsx`

### Fase 3 — Notas fiscais ✅

- [x] `features/notas/` — `notas.service`, `useNotasQuery`, mutations de criar/desvincular
- [x] `NotasListPage` — `FilterBar`, busca, paginação, skeleton, empty state
- [x] `NotasTable` — linhas expansíveis com detalhe de pagamentos
- [x] `NotaFormPage` — validação de campos, toasts, `ConfirmDialog` no desvincular
- [x] Rotas `/notas` e `/notas/new` migradas

### Fase 4 — Importação de faturas (JSON) ✅

- [x] `features/importacoes-faturas/` — service, queries e mutations
- [x] `JsonFileUpload` com `DropZone` + pré-visualização do JSON antes do envio
- [x] `ImportacoesFaturasHistoricoPage` — `DataTable`, busca, exclusão com `ConfirmDialog`
- [x] `ImportacaoFaturaDetalhePage` — resumo, metadados, reprocessar, download, timeline
- [x] Rotas `/importacoes`, `/importacoes/historico`, `/importacoes/historico/:id` migradas

### Fase 5 — Importação de extratos (CSV) ✅

- [x] `features/importacoes-extratos/` — service, queries e mutations
- [x] `CsvUploadCard` com `DropZone`, pré-visualização CSV e upload Asaas/Nubank
- [x] `ImportacoesExtratosHistoricoPage` — filtro por banco, busca, exclusão com confirmação
- [x] `ImportacaoExtratoDetalhePage` — resumo financeiro completo, timeline, tabelas Asaas/Nubank
- [x] Rotas `/importacoes-bancarias/*` migradas

### Fase 6 — Conciliação ✅

- [x] `features/conciliacao/` — service, queries e mutation de vínculo
- [x] `ConciliacaoLancamentoCard` migrado com `conciliacaoService` e toasts
- [x] Layout **split-view**: lista à esquerda + detalhe à direita (mobile com navegação)
- [x] Abas unificadas Pendentes / Sem correspondência com contadores
- [x] Rotas `/conciliacao` e `/conciliacao/sem-match` migradas

### Fase 7 — Relatórios ✅

- [x] `features/relatorios/` — service, types, hooks e utils de exportação
- [x] `ExtracaoNotasPage` — filtros competência/período, KPIs, tabela, export CSV
- [x] `FluxoCaixaPage` — banco Asaas/Nubank, cabeçalho da planilha, export Excel
- [x] Rotas `/relatorios/extracao` e `/relatorios/fluxo-caixa` migradas

### Fase 8 — Qualidade ✅

- [x] Remoção de `pages/`, `layout/` e `components/` legados
- [x] `download.util` migrado para `api.client` direto
- [x] A11y: `DataTable` com caption, `PageLoader` com `role="status"`, conciliação com regiões e radiogroup
- [x] Virtualização de tabelas grandes (`VirtualList`, Fase 9)
- [x] Suite de testes automatizados (Vitest + E2E Playwright) — `npm test` + `npm run e2e`

---

## Convenções

### Imports

```ts
import { Button, Typography } from "@/design-system/atoms";
import { PageHeader } from "@/design-system/molecules";
import api from "@/lib/api-client";
```

### Camada de API

- **Proibido:** `axios`/`fetch` direto em páginas.
- **Obrigatório:** módulos `api.ts` por feature chamando `@/lib/api-client`.

### Componentes

1. Existe em `design-system/`? → usar e evoluir lá.
2. Específico do domínio? → `features/*/components`.

### Estado servidor

```ts
const { data, isLoading, error } = useQuery({
  queryKey: ["notas", page, search],
  queryFn: () => notasService.list({ page, search }),
});
```

---

## Biblioteca UI — inventário resumido

| Categoria | Componentes |
|-----------|-------------|
| Layout | `AppShell`, `MobileNav`, `SplitView`, `AuthTemplate` |
| Form | `Input`, `Label`, `Checkbox`, `FormGroup`, `PeriodFilter` |
| Ação | `Button`, `Badge`, `Modal`, `Sheet`, `ConfirmDialog` |
| Dados | `DataTable`, `VirtualList`, `KPIGrid` |
| Feedback | `Skeleton`, `Spinner`, `EmptyState`, `ErrorState`, `Callout`, `Toast` |
| Conciliação | `MatchScore`, `TaskGuide`, `NextStepBanner` |
| Global | `CommandPalette`, `ThemeToggle`, `PrefetchLink`, `SkipToContent` |
| Tema | `ThemeProvider` (`@/lib/theme`) |

Detalhes: `frontend/docs/UI-COMPONENTS.md`.

---

## Compatibilidade com backend

- **Não alterar** endpoints, payloads ou regras de negócio.
- Services espelham contratos REST existentes em `backend/src/modules/`.

---

## Changelog

| Data | Alteração |
|------|-----------|
| 2026-07-02 | Polish: command palette, tema claro/escuro, focus trap login, wizard inconsistências JSON, docs sincronizados |
| 2026-07-02 | Dívida técnica zerada; E2E Playwright + axe (8/8) |
| 2026-07-01 | Greenfield concluído: `design-system/`, features por domínio, rotas `/arquivos/*` e `/analises/*` |
| 2026-06-30 | 8 | Vitest + E2E; limpeza legado; a11y |
| 2026-06-30 | 7 | Relatórios: extração CSV + fluxo Excel |
| 2026-06-30 | 6 | Conciliação split-view |
| 2026-06-30 | 0–5 | Migração incremental (pré-greenfield) |
