import type { PeriodFilterValue } from "@/design-system/molecules";

export function previousPeriodFilter(filters: PeriodFilterValue): PeriodFilterValue {
  if (filters.filterMode === "mes" && filters.mesPagamento) {
    const [yearStr, monthStr] = filters.mesPagamento.split("-");
    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10);
    const prev = new Date(year, month - 2, 1);
    const prevYear = prev.getFullYear();
    const prevMonth = String(prev.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(prevYear, prev.getMonth() + 1, 0).getDate();
    return {
      filterMode: "mes",
      mesPagamento: `${prevYear}-${prevMonth}`,
      from: `${prevYear}-${prevMonth}-01`,
      to: `${prevYear}-${prevMonth}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  if (filters.from && filters.to) {
    const from = new Date(filters.from);
    const to = new Date(filters.to);
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - (days - 1));
    return {
      filterMode: "periodo",
      mesPagamento: filters.mesPagamento,
      from: prevFrom.toISOString().slice(0, 10),
      to: prevTo.toISOString().slice(0, 10),
    };
  }

  return filters;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function isDateInFilterPeriod(dateStr: string | undefined, filters: PeriodFilterValue): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  if (filters.filterMode === "mes" && filters.mesPagamento) {
    return d.startsWith(filters.mesPagamento);
  }
  if (filters.from && d < filters.from) return false;
  if (filters.to && d > filters.to) return false;
  return true;
}

export function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10) === today;
}
