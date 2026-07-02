# Componentes UI — referência rápida

Fonte oficial: `frontend/src/design-system/` (atoms → molecules → organisms → templates).  
**Última revisão:** 2026-07-02

## Atoms

| Componente | Import | Uso |
|----------|--------|-----|
| `Button` | `@/design-system/atoms` | Primário, outline, ghost, link, danger |
| `Input`, `Label`, `Checkbox` | `@/design-system/atoms` | Formulários |
| `Typography` | `@/design-system/atoms` | Hierarquia tipográfica (h1–caption) |
| `Skeleton`, `Spinner` | `@/design-system/atoms` | Loading |
| `Badge`, `Avatar` | `@/design-system/atoms` | Status e usuário |

## Molecules

| Componente | Import | Uso |
|----------|--------|-----|
| `PageHeader` | `@/design-system/molecules` | Título + descrição + ações |
| `PeriodFilter` | `@/design-system/molecules` | Filtro por mês ou intervalo |
| `EmptyState`, `ErrorState` | `@/design-system/molecules` | Estados vazios e erro |
| `Callout` | `@/design-system/molecules` | Avisos info/success/warning/danger |
| `TaskGuide`, `StepHint`, `NextStepBanner` | `@/design-system/molecules` | Onboarding e próximo passo |
| `MatchScore` | `@/design-system/molecules` | Barra de compatibilidade (conciliação) |
| `SegmentedTabs`, `Pagination` | `@/design-system/molecules` | Abas e paginação |
| `PrefetchLink`, `SkipToContent` | `@/design-system/molecules` | Performance e a11y |
| `ThemeToggle` | `@/design-system/molecules` | Alternar tema claro/escuro |
| `UploadArea` | `@/design-system/molecules` | Arrastar arquivo (wizards) |

## Organisms

| Componente | Import | Uso |
|----------|--------|-----|
| `AppShell`, `MobileNav` | `@/design-system/organisms` | Layout autenticado |
| `DataTable` | `@/design-system/organisms` | Tabela ordenável + virtualização (50+ linhas) |
| `VirtualList` | `@/design-system/organisms` | Filas longas (conciliação, notas) |
| `Card`, `Modal`, `Sheet` | `@/design-system/organisms` | Superfícies e overlays |
| `SplitView` | `@/design-system/organisms` | Lista + painel (desktop) |
| `ConfirmDialog` | `@/design-system/organisms` | Confirmação destrutiva |
| `CommandPalette` | `@/design-system/organisms` | Busca global de telas (`Ctrl+K`) |
| `AttentionPanel`, `KPIGrid`, `Wizard` | `@/design-system/organisms` | Dashboard e wizards |

## Templates

| Componente | Import | Uso |
|----------|--------|-----|
| `AuthTemplate` | `@/design-system/templates` | Login |
| `DashboardTemplate` | `@/design-system/templates` | Página inicial |
| `ListTemplate`, `FormTemplate` | `@/design-system/templates` | Listagens e formulários |
| `WizardTemplate` | `@/design-system/templates` | Fluxos em passos |
| `ConciliationTemplate`, `ReportTemplate` | `@/design-system/templates` | Conciliação e relatórios |

## App & lib

| Recurso | Import | Uso |
|--------|--------|-----|
| `useToast` | `@/app/toast-provider` | Notificações |
| `useAuth` | `@/features/auth/context` | Sessão do usuário |
| `useTheme` | `@/lib/theme` | Tema claro/escuro |
| `api` | `@/lib/api-client` | Cliente HTTP com refresh |
| `ROUTES`, labels | `@/lib/constants` | Rotas e rótulos de domínio |
| `COMMAND_ROUTES` | `@/lib/command-routes` | Itens da command palette |

## Exemplo DataTable

```tsx
import { DataTable, type DataTableColumn } from "@/design-system/organisms";

const columns: DataTableColumn<Nota>[] = [
  { id: "numero", header: "Número", cell: (row) => row.numero, sortable: true },
];

<DataTable
  columns={columns}
  data={items}
  rowKey={(row) => row._id}
  loading={isLoading}
  emptyTitle="Nenhuma nota"
  emptyDescription="Envie suas notas ou registre uma manualmente."
/>
```

Tokens: `frontend/src/design-system/tokens.css`. WCAG: `docs/WCAG-AUDIT.md`.
