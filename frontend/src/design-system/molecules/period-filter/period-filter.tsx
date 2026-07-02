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
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={value.filterMode === "mes" ? "primary" : "outline"}
          onClick={() => onChange({ ...value, filterMode: "mes" })}
        >
          Por mês
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.filterMode === "periodo" ? "primary" : "outline"}
          onClick={() => {
            const range = currentMonthDateRange();
            onChange({ ...value, filterMode: "periodo", from: range.from, to: range.to });
          }}
        >
          Por intervalo
        </Button>
      </div>
      {value.filterMode === "mes" ? (
        <div>
          <Label htmlFor="mes">Mês</Label>
          <Input
            id="mes"
            type="month"
            className="mt-2"
            value={value.mesPagamento}
            onChange={(e) => onChange({ ...value, mesPagamento: e.target.value })}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="from">De</Label>
            <Input id="from" type="date" className="mt-2" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="to">Até</Label>
            <Input id="to" type="date" className="mt-2" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} />
          </div>
        </div>
      )}
      {onApply && (
        <Button type="button" onClick={onApply} loading={loading}>
          Aplicar filtros
        </Button>
      )}
    </div>
  );
}
