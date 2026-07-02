import { ReactNode } from "react";
import Input from "@ui/components/form/input/InputField";
import Button from "@ui/components/ui/button/Button";

type DataTableToolbarProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onExport?: () => void;
  exportLabel?: string;
  children?: ReactNode;
  resultCount?: number;
};

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  onExport,
  exportLabel = "Exportar",
  children,
  resultCount,
}: DataTableToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {onSearchChange != null && (
          <div className="w-full min-w-[200px] max-w-sm">
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Buscar na tabela"
            />
          </div>
        )}
        {children}
        {resultCount != null && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{resultCount} registro(s)</span>
        )}
      </div>
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport}>
          {exportLabel}
        </Button>
      )}
    </div>
  );
}
