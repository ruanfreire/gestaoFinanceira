import { ReactNode } from "react";
import Button from "@ui/components/ui/button/Button";

type FilterBarProps = {
  children: ReactNode;
  onRefresh?: () => void;
  refreshLabel?: string;
  loading?: boolean;
  className?: string;
};

/** Barra de filtros padronizada: grid responsivo + botão atualizar opcional */
export function FilterBar({
  children,
  onRefresh,
  refreshLabel = "Atualizar",
  loading = false,
  className = "",
}: FilterBarProps) {
  return (
    <div className={`mb-4 flex flex-wrap items-end gap-3 ${className}`}>
      <div className="grid flex-1 gap-3 md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        {children}
      </div>
      {onRefresh && (
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          {refreshLabel}
        </Button>
      )}
    </div>
  );
}
