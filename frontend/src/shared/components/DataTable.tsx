import { Fragment, ReactNode, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@ui/components/ui/table";
import EmptyState from "@ui/components/ui/empty-state/EmptyState";
import Pagination from "@ui/components/ui/pagination/Pagination";
import Skeleton from "@ui/components/ui/skeleton/Skeleton";
import { DataTableToolbar } from "./DataTableToolbar";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  ariaLabel?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  sortKey?: string | null;
  sortDirection?: "asc" | "desc";
  onSortChange?: (key: string) => void;
  onExport?: () => void;
  exportLabel?: string;
  toolbarExtra?: ReactNode;
  renderExpandedRow?: (row: T) => ReactNode;
  expandedRowKeys?: string[];
};

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 5,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  page,
  totalPages,
  totalItems,
  onPageChange,
  className = "",
  ariaLabel = "Tabela de dados",
  search,
  onSearchChange,
  searchPlaceholder,
  searchFilter,
  sortKey,
  sortDirection = "asc",
  onSortChange,
  onExport,
  exportLabel,
  toolbarExtra,
  renderExpandedRow,
  expandedRowKeys,
}: DataTableProps<T>) {
  const colSpan = columns.length;

  const displayData = useMemo(() => {
    let rows = [...data];
    const q = search?.trim().toLowerCase();
    if (q && searchFilter) {
      rows = rows.filter((row) => searchFilter(row, q));
    }
    if (sortKey && onSortChange) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        rows.sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sortDirection === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [columns, data, onSortChange, search, searchFilter, sortDirection, sortKey]);

  const showToolbar = onSearchChange || onExport || toolbarExtra;

  return (
    <div className={className}>
      {showToolbar && (
        <DataTableToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          onExport={onExport}
          exportLabel={exportLabel}
          resultCount={displayData.length}
        >
          {toolbarExtra}
        </DataTableToolbar>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <Table>
          <caption className="sr-only">{ariaLabel}</caption>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} isHeader className={col.headerClassName}>
                  {col.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-brand-600 dark:hover:text-brand-400"
                      onClick={() => onSortChange(col.key)}
                    >
                      {col.header}
                      {sortKey === col.key && (
                        <span aria-hidden>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <TableRow key={`sk-${rowIndex}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.cellClassName}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && displayData.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                    embedded
                    className="border-0 bg-transparent"
                  />
                </td>
              </tr>
            )}

            {!loading &&
              displayData.map((row, index) => {
                const key = rowKey(row, index);
                return (
                  <Fragment key={key}>
                    <TableRow>
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.cellClassName}>
                          {col.cell(row, index)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {renderExpandedRow && expandedRowKeys?.includes(key) && (
                      <tr>
                        <td colSpan={colSpan} className="bg-gray-50/50 p-4 dark:bg-gray-900/40">
                          {renderExpandedRow(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {onPageChange && page != null && totalPages != null && totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={onPageChange}
            disabled={loading}
          />
        </div>
      )}
    </div>
  );
}

export { PageLoader } from "./DataTablePageLoader";
