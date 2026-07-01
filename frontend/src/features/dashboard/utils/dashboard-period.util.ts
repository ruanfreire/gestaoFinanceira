import type { DashboardFilters } from "../types/dashboard.types";

function dateKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

function paymentMonthKey(value: string | Date): string {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

export function isDateInDashboardPeriod(
  value: string | Date | undefined,
  filters: DashboardFilters,
): boolean {
  if (!value) return false;

  if (filters.filterMode === "mes" && filters.mesPagamento) {
    return paymentMonthKey(value) === filters.mesPagamento;
  }

  if (filters.filterMode === "periodo" && filters.from && filters.to) {
    const day = dateKey(value);
    return day >= filters.from && day <= filters.to;
  }

  return true;
}

export function formatDashboardPeriodLabel(filters: DashboardFilters): string {
  if (filters.filterMode === "mes" && filters.mesPagamento) {
    const [year, month] = filters.mesPagamento.split("-");
    return `pagamentos em ${month}/${year}`;
  }
  if (filters.filterMode === "periodo" && filters.from && filters.to) {
    const format = (iso: string) => {
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    };
    return `pagamentos de ${format(filters.from)} a ${format(filters.to)}`;
  }
  return "todo o histórico";
}
