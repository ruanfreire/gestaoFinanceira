import { CalendarRange } from "lucide-react";
import { Button, Input, Label, Typography } from "@/design-system/atoms";
import { currentMesPagamento, currentMonthDateRange } from "@/lib/format";

export type PeriodFilterValue = {
  filterMode: "mes" | "periodo";
  mesPagamento: string;
  from: string;
  to: string;
};

export function validatePeriodFilter(filters: PeriodFilterValue): string | null {
  if (filters.filterMode === "periodo") {
    if (!filters.from || !filters.to) return "Informe as datas inicial e final.";
    if (filters.from > filters.to) return "A data inicial não pode ser posterior à data final.";
  }
  return null;
}

export function defaultPeriodFilter(): PeriodFilterValue {
  const range = currentMonthDateRange();
  return { filterMode: "mes", mesPagamento: currentMesPagamento(), from: range.from, to: range.to };
}

export function paymentDateApiParams(filters: PeriodFilterValue): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.filterMode === "mes" && filters.mesPagamento) params.mes_pagamento = filters.mesPagamento;
  else {
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  }
  return params;
}

export function CompactPeriodToolbar({
  value,
  onChange,
  idPrefix = "period",
}: {
  value: PeriodFilterValue;
  onChange: (next: PeriodFilterValue) => void;
  idPrefix?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 hidden items-center gap-1.5 text-caption font-medium text-muted-foreground sm:inline-flex">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          Período
        </span>
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
          <Button
            type="button"
            size="sm"
            variant={value.filterMode === "mes" ? "primary" : "ghost"}
            className="h-8 px-3"
            onClick={() => onChange({ ...value, filterMode: "mes" })}
          >
            Mês
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value.filterMode === "periodo" ? "primary" : "ghost"}
            className="h-8 px-3"
            onClick={() => {
              const range = currentMonthDateRange();
              onChange({ ...value, filterMode: "periodo", from: range.from, to: range.to });
            }}
          >
            Intervalo
          </Button>
        </div>
      </div>

      {value.filterMode === "mes" ? (
        <div className="w-full sm:w-auto sm:min-w-[11rem]">
          <Label htmlFor={`${idPrefix}-mes`} className="sr-only">
            Mês
          </Label>
          <Input
            id={`${idPrefix}-mes`}
            type="month"
            className="h-9"
            value={value.mesPagamento}
            onChange={(e) => onChange({ ...value, mesPagamento: e.target.value })}
          />
        </div>
      ) : (
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <div className="sm:min-w-[9.5rem]">
            <Label htmlFor={`${idPrefix}-from`} className="sr-only">
              De
            </Label>
            <Input
              id={`${idPrefix}-from`}
              type="date"
              className="h-9"
              value={value.from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </div>
          <div className="sm:min-w-[9.5rem]">
            <Label htmlFor={`${idPrefix}-to`} className="sr-only">
              Até
            </Label>
            <Input
              id={`${idPrefix}-to`}
              type="date"
              className="h-9"
              value={value.to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function PeriodFilter({
  value,
  onChange,
  onApply,
  loading,
}: {
  value: PeriodFilterValue;
  onChange: (next: PeriodFilterValue) => void;
  onApply?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="stack-gap rounded-xl border border-border bg-surface p-4 shadow-xs">
      <Typography variant="overline">Período</Typography>
      <CompactPeriodToolbar value={value} onChange={onChange} idPrefix="period-filter" />
      {onApply && (
        <Button type="button" size="sm" className="w-full sm:w-auto" onClick={onApply} loading={loading}>
          Aplicar filtros
        </Button>
      )}
    </div>
  );
}
