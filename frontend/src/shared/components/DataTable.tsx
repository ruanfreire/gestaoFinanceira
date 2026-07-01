import { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@ui/components/ui/table";
import Spinner from "@ui/components/ui/spinner/Spinner";
import EmptyState from "@ui/components/ui/empty-state/EmptyState";
import Pagination from "@ui/components/ui/pagination/Pagination";
import Skeleton from "@ui/components/ui/skeleton/Skeleton";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
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
  /** Rótulo acessível da tabela (leitores de tela) */
  ariaLabel?: string;
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
}: DataTableProps<T>) {
  const colSpan = columns.length;

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <Table>
          <caption className="sr-only">{ariaLabel}</caption>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} isHeader className={col.headerClassName}>
                  {col.header}
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

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                    className="border-0 bg-transparent"
                  />
                </td>
              </tr>
            )}

            {!loading &&
              data.map((row, index) => (
                <TableRow key={rowKey(row, index)}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.cellClassName}>
                      {col.cell(row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
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

export function PageLoader({ label = "Carregando página..." }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size="lg" label={label} />
    </div>
  );
}
