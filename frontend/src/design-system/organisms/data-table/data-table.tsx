import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { SearchInput, Pagination, EmptyState } from "@/design-system/molecules";
import { Skeleton, Typography } from "@/design-system/atoms";
import { Card, CardBody } from "@/design-system/organisms/card/card";
import { cn } from "@/design-system/lib/cn";
import { nextSortDirection, sortRows, type SortDirection } from "@/lib/sort-rows";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
};

const VIRTUALIZE_THRESHOLD = 50;
const ROW_HEIGHT = 48;

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
  virtualize,
  virtualizeThreshold = VIRTUALIZE_THRESHOLD,
  defaultSort,
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
  virtualize?: boolean;
  virtualizeThreshold?: number;
  defaultSort?: { columnId: string; direction: SortDirection };
}) {
  const [sort, setSort] = useState<{ columnId: string; direction: SortDirection } | null>(
    defaultSort ?? null,
  );
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const rowKey = (row: T, i: number) => row._id ?? row.id ?? String(i);

  const sortColumn = sort ? columns.find((c) => c.id === sort.columnId) : undefined;

  const displayData = useMemo(() => {
    if (!sort || !sortColumn?.sortValue) return data;
    return sortRows(data, sortColumn.sortValue, sort.direction);
  }, [data, sort, sortColumn]);

  const shouldVirtualize = Boolean(virtualize) && displayData.length >= virtualizeThreshold;

  const rowVirtualizer = useVirtualizer({
    count: displayData.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable || !col.sortValue) return;
    setSort((current) => {
      if (current?.columnId !== col.id) return { columnId: col.id, direction: "asc" };
      return { columnId: col.id, direction: nextSortDirection(current.direction) };
    });
  };

  const sortIcon = (col: DataTableColumn<T>) => {
    if (!col.sortable) return null;
    if (sort?.columnId !== col.id) return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" aria-hidden />;
    return sort.direction === "asc" ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5" aria-hidden />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5" aria-hidden />
    );
  };

  const renderRow = (row: T, i: number) => (
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
  );

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

      {!loading && displayData.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}

      {!loading && displayData.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {displayData.map((row, i) => (
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
          <div
            ref={shouldVirtualize ? tableScrollRef : undefined}
            className={cn(
              "hidden overflow-x-auto rounded-xl border border-border lg:block",
              shouldVirtualize && "max-h-[min(60vh,520px)] overflow-y-auto",
            )}
          >
            <table className="w-full text-left text-body">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface-sunken">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      className={cn(
                        "px-4 py-3 font-medium text-muted-foreground",
                        col.sortable && "cursor-pointer select-none hover:text-foreground",
                        col.className,
                      )}
                      onClick={() => toggleSort(col)}
                      aria-sort={
                        sort?.columnId === col.id
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : col.sortable
                            ? "none"
                            : undefined
                      }
                    >
                      {col.header}
                      {sortIcon(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shouldVirtualize ? (
                  <>
                    {(() => {
                      const virtualRows = rowVirtualizer.getVirtualItems();
                      const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
                      const paddingBottom =
                        virtualRows.length > 0
                          ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
                          : 0;
                      return (
                        <>
                          {paddingTop > 0 && (
                            <tr aria-hidden>
                              <td colSpan={columns.length} style={{ height: paddingTop, padding: 0, border: 0 }} />
                            </tr>
                          )}
                          {virtualRows.map((virtualRow) =>
                            renderRow(displayData[virtualRow.index], virtualRow.index),
                          )}
                          {paddingBottom > 0 && (
                            <tr aria-hidden>
                              <td colSpan={columns.length} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  displayData.map((row, i) => renderRow(row, i))
                )}
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
      {columns
        .filter((c) => !c.hideOnMobile)
        .slice(0, 3)
        .map((col) => (
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
