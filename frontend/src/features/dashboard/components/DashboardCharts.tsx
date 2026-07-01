import ComponentCard from "@ui/components/common/ComponentCard";
import FinanceAreaChart from "@ui/components/charts/FinanceAreaChart";
import FinanceBarChart from "@ui/components/charts/FinanceBarChart";
import EmptyState from "@ui/components/ui/empty-state/EmptyState";
import { formatCurrency } from "@/utils/nota-format.util";
import type { DashboardData, DashboardDateBasis } from "../types/dashboard.types";

type DashboardChartsProps = {
  competenciaChart: DashboardData["competenciaChart"];
  conciliacaoChart: DashboardData["conciliacaoChart"];
  periodLabel: string;
  dateBasis: DashboardDateBasis;
};

const currencyFormatter = (value: number) => formatCurrency(value);

export function DashboardCharts({
  competenciaChart,
  conciliacaoChart,
  periodLabel,
  dateBasis,
}: DashboardChartsProps) {
  const hasCompetenciaData =
    competenciaChart.categories.length > 0 &&
    (competenciaChart.emitido.some((v) => v > 0) ||
      competenciaChart.recebido.some((v) => v > 0));

  const hasConciliacaoData = conciliacaoChart.values.some((v) => v > 0);

  const chartTitle =
    dateBasis === "emissao" ? "Notas por mês de emissão" : "Recebimentos por mês de pagamento";
  const chartDesc =
    dateBasis === "emissao"
      ? `Valor emitido das notas no período (${periodLabel}). Recebido pode ser zero sem faturas pagas.`
      : `Valor emitido vs. recebido no período selecionado (${periodLabel}).`;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
      <ComponentCard title={chartTitle} desc={chartDesc}>
        {hasCompetenciaData ? (
          <FinanceAreaChart
            categories={competenciaChart.categories}
            series={[
              { name: "Emitido", data: competenciaChart.emitido },
              { name: "Recebido", data: competenciaChart.recebido },
            ]}
            valueFormatter={currencyFormatter}
          />
        ) : (
          <EmptyState
            embedded
            title="Sem dados no período"
            description={
              dateBasis === "emissao"
                ? "Não há notas emitidas no período selecionado."
                : "Não há recebimentos no período selecionado."
            }
          />
        )}
      </ComponentCard>

      <ComponentCard
        title="Situação geral"
        desc={`Conciliação bancária e status de pagamento das notas (${periodLabel}).`}
      >
        {hasConciliacaoData ? (
          <FinanceBarChart
            categories={conciliacaoChart.categories}
            series={[{ name: "Quantidade", data: conciliacaoChart.values }]}
            colors={["#465fff", "#12b76a", "#f79009", "#f04438"]}
            valueFormatter={(v) => `${Math.round(v)}`}
          />
        ) : (
          <EmptyState
            embedded
            title="Nenhum dado disponível"
            description="Cadastre notas e importe extratos para popular o painel."
          />
        )}
      </ComponentCard>
    </div>
  );
}
