import { FormEvent, useState } from "react";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import ComponentCard from "@ui/components/common/ComponentCard";
import {
  PeriodFilterForm,
  validatePeriodFilter,
  type PeriodFilterValues,
} from "@/shared/components/PeriodFilterForm";
import { currentMesPagamento } from "@/features/relatorios/services/relatorios.service";
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
  const [periodValues, setPeriodValues] = useState<PeriodFilterValues>({
    filterMode: filters.filterMode,
    mesPagamento: filters.mesPagamento,
    from: filters.from,
    to: filters.to,
  });
  const [error, setError] = useState<string | null>(null);

  const handlePeriodChange = (patch: Partial<PeriodFilterValues>) => {
    setPeriodValues((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationError = validatePeriodFilter(periodValues);
    if (validationError) {
      setError(validationError);
      return;
    }

    onApply({
      filterMode: periodValues.filterMode as DashboardFilterMode,
      mesPagamento: periodValues.mesPagamento,
      from: periodValues.from,
      to: periodValues.to,
    });
  };

  return (
    <ComponentCard
      compact
      title="Período exibido"
      desc="Prioriza pagamentos; se não houver, exibe notas pela data de emissão no mesmo período."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PeriodFilterForm
          values={periodValues}
          onChange={handlePeriodChange}
          radioName="dashboardFilterMode"
        />

        {error && <Alert variant="error" title="Período inválido" message={error} />}

        <Button type="submit" disabled={loading} loading={loading}>
          {loading ? "Aplicando…" : "Aplicar período"}
        </Button>
      </form>
    </ComponentCard>
  );
}
