import { FormEvent, useState } from "react";
import MonthPicker from "@ui/components/form/month-picker";
import DatePicker from "@ui/components/form/date-picker";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import ComponentCard from "@ui/components/common/ComponentCard";
import {
  currentMesPagamento,
  currentMonthDateRange,
} from "@/features/relatorios/services/relatorios.service";
import type { DashboardFilterMode, DashboardFilters } from "../types/dashboard.types";

type DashboardFiltersBarProps = {
  filters: DashboardFilters;
  onApply: (filters: DashboardFilters) => void;
  loading?: boolean;
};

export function createDefaultDashboardFilters(): DashboardFilters {
  return {
    filterMode: "mes",
    mesPagamento: currentMesPagamento(),
    from: "",
    to: "",
  };
}

export function DashboardFiltersBar({ filters, onApply, loading }: DashboardFiltersBarProps) {
  const [filterMode, setFilterMode] = useState<DashboardFilterMode>(filters.filterMode);
  const [mesPagamento, setMesPagamento] = useState(filters.mesPagamento);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [error, setError] = useState<string | null>(null);

  const handleFilterModeChange = (mode: DashboardFilterMode) => {
    setFilterMode(mode);
    if (mode === "periodo" && !from && !to) {
      const range = currentMonthDateRange();
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (filterMode === "periodo") {
      if (!from || !to) {
        setError("Informe a data inicial e a data final do período de pagamento.");
        return;
      }
      if (from > to) {
        setError("A data inicial não pode ser posterior à data final.");
        return;
      }
    }

    onApply({
      filterMode,
      mesPagamento,
      from,
      to,
    });
  };

  return (
    <ComponentCard title="Período exibido" desc="Prioriza pagamentos; se não houver, exibe notas pela data de emissão no mesmo período.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              name="dashboardFilterMode"
              checked={filterMode === "mes"}
              onChange={() => handleFilterModeChange("mes")}
              className="text-brand-500"
            />
            Por mês de pagamento
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              name="dashboardFilterMode"
              checked={filterMode === "periodo"}
              onChange={() => handleFilterModeChange("periodo")}
              className="text-brand-500"
            />
            Por período de pagamento
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filterMode === "mes" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mês de pagamento
              </label>
              <MonthPicker value={mesPagamento} onChange={setMesPagamento} required />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pagamento de
                </label>
                <DatePicker value={from} onChange={setFrom} max={to || undefined} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pagamento até
                </label>
                <DatePicker value={to} onChange={setTo} min={from || undefined} />
              </div>
            </>
          )}
        </div>

        {error && <Alert variant="error" title="Período inválido" message={error} />}

        <Button type="submit" disabled={loading}>
          {loading ? "Aplicando…" : "Aplicar período"}
        </Button>
      </form>
    </ComponentCard>
  );
}
