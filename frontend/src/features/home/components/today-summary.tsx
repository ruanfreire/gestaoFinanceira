import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";
import type { TodaySummary, DashboardKpis } from "../api";

export function TodaySummary({
  summary,
  kpis,
}: {
  summary: TodaySummary;
  kpis: DashboardKpis;
}) {
  const items = [
    {
      label: "Notas importadas hoje",
      value: summary.notasImportadas,
    },
    {
      label: "Extratos importados hoje",
      value: summary.extratosImportados,
    },
    {
      label: "Pagamentos pendentes",
      value: kpis.pendentesConciliacao,
    },
    {
      label: "Importações com erro hoje",
      value: summary.importacoesComErro,
      highlight: summary.importacoesComErro > 0,
    },
  ];

  return (
    <Card>
      <CardHeader title="Resumo operacional" description="Indicadores do dia e do período" />
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border bg-muted/30 p-4 transition-default hover:bg-muted/50"
            >
              <Typography variant="caption" tone="muted">
                {item.label}
              </Typography>
              <Typography
                variant="h3"
                className={cn("mt-1 tabular-nums", item.highlight && "text-danger")}
                as="p"
              >
                {item.value}
              </Typography>
            </div>
          ))}
        </div>
        <Typography variant="caption" tone="muted" className="mt-4">
          {kpis.importsInPeriod} importação(ões) no período selecionado · {kpis.totalNotas} nota(s) analisadas
        </Typography>
      </CardBody>
    </Card>
  );
}
