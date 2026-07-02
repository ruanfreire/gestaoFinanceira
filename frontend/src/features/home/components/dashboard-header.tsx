import { Typography } from "@/design-system/atoms";
import type { PeriodFilterValue } from "@/design-system/molecules";
import { formatCompetencia } from "@/lib/format";
import { DashboardPeriodToolbar } from "./dashboard-period-toolbar";

function formatPeriodLabel(filters: PeriodFilterValue): string {
  if (filters.filterMode === "mes" && filters.mesPagamento) {
    return formatCompetencia(filters.mesPagamento);
  }
  if (filters.from && filters.to) {
    return `${filters.from.split("-").reverse().join("/")} – ${filters.to.split("-").reverse().join("/")}`;
  }
  return "Período atual";
}

export function DashboardHeader({
  filters,
  onFiltersChange,
  onApplyFilters,
  loading,
  dateBasis,
}: {
  userName?: string;
  filters: PeriodFilterValue;
  onFiltersChange: (next: PeriodFilterValue) => void;
  onApplyFilters: () => void;
  loading?: boolean;
  dateBasis?: "pagamento" | "emissao";
}) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Typography variant="h1" as="h1">
            Início
          </Typography>
          <Typography variant="caption" tone="muted" className="mt-1">
            {formatPeriodLabel(filters)}
            {dateBasis && ` · base ${dateBasis === "pagamento" ? "pagamento" : "emissão"}`}
          </Typography>
        </div>
      </div>
      <DashboardPeriodToolbar
        value={filters}
        onChange={onFiltersChange}
        onApply={onApplyFilters}
        loading={loading}
      />
    </header>
  );
}
