# Reescrita do Frontend — Gestão Financeira

Documento vivo da refatoração arquitetural do frontend.  
**Regra de ouro:** a pasta `/UI` é a fonte oficial de componentes — reutilizar e evoluir, nunca duplicar.

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
| Tailwind 4 | Estilos (tokens em `UI/src/index.css`) |
| React Router 6 | Rotas |
| Axios | HTTP (`shared/services/api.client.ts`) |
| TanStack Query | Cache e estado servidor (a partir da Fase 0) |
| react-dropzone | Upload (primitivo `DropZone` em `/UI`) |

## Estrutura alvo

```
frontend/src/
├── app/                 # Bootstrap, providers, router
├── layouts/             # AppShell, sidebar, header
├── features/            # Domínios (auth, notas, importações, …)
├── shared/              # Componentes/hooks/utils transversais
└── utils/               # Utilitários compartilhados (formatação, CSV, download)

UI/                      # Design system TailAdmin — fonte oficial
```

## Mapa de rotas (atual)

| Rota | Feature alvo | Status migração |
|------|--------------|-----------------|
| `/auth/signin` | `features/auth` | ✅ Fase 1 |
| `/` | `features/dashboard` | ✅ Fase 2 |
| `/notas` | `features/notas` | ✅ Fase 3 |
| `/notas/new` | `features/notas` | ✅ Fase 3 |
| `/importacoes` | `features/importacoes-faturas` | ✅ Fase 4 |
| `/importacoes/historico` | `features/importacoes-faturas` | ✅ Fase 4 |
| `/importacoes/historico/:id` | `features/importacoes-faturas` | ✅ Fase 4 |
| `/importacoes-bancarias` | `features/importacoes-extratos` | ✅ Fase 5 |
| `/importacoes-bancarias/historico` | `features/importacoes-extratos` | ✅ Fase 5 |
| `/importacoes-bancarias/historico/:banco/:id` | `features/importacoes-extratos` | ✅ Fase 5 |
| `/conciliacao` | `features/conciliacao` | ✅ Fase 6 |
| `/conciliacao/sem-match` | `features/conciliacao` | ✅ Fase 6 |
| `/relatorios/extracao` | `features/relatorios` | ✅ Fase 7 |
| `/relatorios/fluxo-caixa` | `features/relatorios` | ✅ Fase 7 |

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
- [x] A11y: `DataTable` com caption, `PageLoader` com `role="status"`, conciliação com regiões e listbox
- [ ] Virtualização de tabelas grandes (quando necessário)
- [x] Suite de testes automatizados (Vitest + Testing Library) — `npm run test --workspace frontend`

---

## Convenções

### Imports

```ts
import Button from "@ui/components/ui/button/Button";
import { PageHeader } from "@/shared/components/PageHeader";
import api from "@/shared/services/api.client";
```

### Camada de API

- **Proibido:** `axios`/`fetch` direto em páginas (exceto migração temporária).
- **Obrigatório:** services por feature chamando `api.client`.

### Componentes

1. Existe em `/UI`? → usar.
2. Precisa evoluir? → evoluir em `/UI`.
3. Específico do app? → `shared/components` ou `features/*/components`.

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
| Layout | `AppLayout`, `AppSidebar`, `AppHeader`, `Backdrop`, `PageMeta`, `PageBreadcrumb` |
| Form | `Input`, `Select`, `DatePicker`, `DropZone`, `Form`, `Label`, … |
| Ação | `Button`, `Badge`, `Modal`, `Dropdown` |
| Dados | `Table` (+ `DataTable` no shared) |
| Feedback | `Alert`, `Spinner`, `Skeleton`, `EmptyState`, `Toast`, `ConfirmDialog`, `Pagination` |
| Métricas / Gráficos | `MetricCard`, `FinanceAreaChart`, `FinanceBarChart`, `ComponentCard` |
| Contextos | `ThemeProvider`, `SidebarProvider`, `ToastProvider` |

Detalhes completos: ver relatório de análise na conversa de arquitetura (jun/2026).

---

## Compatibilidade com backend

- **Não alterar** endpoints, payloads ou regras de negócio.
- Services espelham contratos REST existentes em `backend/src/modules/`.

---

## Changelog

| Data | Fase | Alteração |
|------|------|-----------|
| 2026-06-30 | 8 | Vitest + Testing Library: utils, services, componentes e smoke de páginas |
| 2026-06-30 | 8 | Limpeza do legado (`pages/`, shims), a11y em tabelas e conciliação |
| 2026-06-30 | 7 | Relatórios: extração de notas com KPIs e CSV; fluxo de caixa com export Excel |
| 2026-06-30 | 6 | Conciliação unificada: split-view, abas pendentes/sem-match, TanStack Query |
| 2026-06-30 | 5 | Extratos CSV: upload com preview, histórico, detalhe financeiro Asaas/Nubank com timeline |
| 2026-06-30 | 4 | Importação JSON: upload com preview, histórico CRUD, detalhe com timeline e reprocessamento |
| 2026-06-30 | 3 | Notas fiscais: service, listagem com tabela expansível, formulário validado, TanStack Query |
| 2026-06-30 | 2 | Dashboard executivo com KPIs, gráficos, importações recentes, alertas e conciliação |
| 2026-06-30 | 1 | Auth unificado, sidebar agrupada, breadcrumbs no layout, SignInForm evoluído |
| 2026-06-30 | 0 | Documentação, fundação arquitetural, componentes UI de feedback, lazy routes, TanStack Query |
