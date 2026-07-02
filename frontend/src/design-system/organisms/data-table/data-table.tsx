import { SearchInput, Pagination, EmptyState } from "@/design-system/molecules";
import { Skeleton, Typography } from "@/design-system/atoms";
import { Card, CardBody } from "@/design-system/organisms/card/card";
import { cn } from "@/design-system/lib/cn";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
};

export function DataTable<T extends { _id?: string; id?: string }>({
  columns,
  data,
  loading,
  search,
  onSearchChange,
  searchPlaceholder,
  page,
  totalPages,
  onPageChange,
  onRowClick,
  emptyTitle = "Nenhum registro",
  emptyDescription = "Não há dados para exibir.",
  mobileCard,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  search?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  mobileCard?: (row: T) => React.ReactNode;
}) {
  const rowKey = (row: T, i: number) => row._id ?? row.id ?? String(i);

  return (
    <div className="stack-gap">
      {onSearchChange && (
        <SearchInput value={search ?? ""} onChange={onSearchChange} placeholder={searchPlaceholder} />
      )}

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {!loading && data.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}

      {!loading && data.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {data.map((row, i) => (
              <Card
                key={rowKey(row, i)}
                hover={Boolean(onRowClick)}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={() => onRowClick?.(row)}
              >
                <CardBody>{mobileCard ? mobileCard(row) : <DefaultMobile columns={columns} row={row} />}</CardBody>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
            <table className="w-full text-left text-body">
              <thead className="border-b border-border bg-surface-sunken">
                <tr>
                  {columns.map((col) => (
                    <th key={col.id} className={cn("px-4 py-3 font-medium text-muted-foreground", col.className)}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={rowKey(row, i)}
                    className={cn(
                      "border-b border-border-subtle transition-default last:border-0",
                      onRowClick && "cursor-pointer hover:bg-muted/50",
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td key={col.id} className={cn("px-4 py-3", col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {page && totalPages && onPageChange && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}

function DefaultMobile<T>({ columns, row }: { columns: DataTableColumn<T>[]; row: T }) {
  return (
    <div className="space-y-1">
      {columns.slice(0, 3).map((col) => (
        <div key={col.id} className="flex justify-between gap-2 text-small">
          <Typography variant="caption" tone="muted">
            {col.header}
          </Typography>
          <span>{col.cell(row)}</span>
        </div>
      ))}
    </div>
  );
}
