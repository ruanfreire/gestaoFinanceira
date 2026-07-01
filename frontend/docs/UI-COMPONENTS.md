# Componentes UI — referência rápida

Fonte oficial: `UI/src/components/`

## Novos na Fase 0

| Componente | Import | Uso |
|----------|--------|-----|
| `Spinner` | `@ui/components/ui/spinner/Spinner` | Loading inline e páginas |
| `Skeleton` | `@ui/components/ui/skeleton/Skeleton` | Placeholder de conteúdo |
| `EmptyState` | `@ui/components/ui/empty-state/EmptyState` | Listas vazias |
| `Pagination` | `@ui/components/ui/pagination/Pagination` | Navegação de páginas |
| `ToastProvider` / `useToast` | `@ui/components/ui/toast/ToastContext` | Notificações |
| `ConfirmDialog` | `@ui/components/ui/confirm-dialog/ConfirmDialog` | Confirmações |
| `DropZone` | `@ui/components/form/DropZone` | Upload drag-and-drop |

## Shared (app)

| Componente | Import | Uso |
|----------|--------|-----|
| `PageHeader` | `@/shared/components/PageHeader` | Título + breadcrumb + ações |
| `FilterBar` | `@/shared/components/FilterBar` | Barra de filtros |
| `DataTable` | `@/shared/components/DataTable` | Tabela com skeleton/empty/pagination |
| `PageLoader` | `@/shared/components/DataTable` | Suspense fallback |
| `useConfirm` | `@/shared/hooks/useConfirm` | Confirmação programática |
| `api` | `@/shared/services/api.client` | Cliente HTTP |
| `getApiErrorMessage` | `@/shared/services/api.client` | Mensagens de erro |

## Exemplo Toast

```tsx
import { useToast } from "@ui/components/ui/toast/ToastContext";

const { showToast } = useToast();
showToast({ variant: "success", title: "Salvo com sucesso" });
```

## Exemplo DataTable

```tsx
import { DataTable, type DataTableColumn } from "@/shared/components";

const columns: DataTableColumn<Nota>[] = [
  { key: "numero", header: "Número", cell: (row) => row.numero },
];

<DataTable
  columns={columns}
  data={items}
  rowKey={(row) => row._id}
  loading={isLoading}
  page={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```
