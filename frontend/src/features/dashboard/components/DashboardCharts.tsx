import ComponentCard from "@ui/components/common/ComponentCard";
import FinanceAreaChart from "@ui/components/charts/FinanceAreaChart";
import FinanceBarChart from "@ui/components/charts/FinanceBarChart";
import EmptyState from "@ui/components/ui/empty-state/EmptyState";
import { formatCurrency } from "@/utils/nota-format.util";
import type { DashboardData } from "../types/dashboard.types";

type DashboardChartsProps = {
  competenciaChart: DashboardData["competenciaChart"];
  conciliacaoChart: DashboardData["conciliacaoChart"];
  periodLabel: string;
};

const currencyFormatter = (value: number) => formatCurrency(value);

export function DashboardCharts({
  competenciaChart,
  conciliacaoChart,
  periodLabel,
}: DashboardChartsProps) {
  const hasCompetenciaData =
    competenciaChart.categories.length > 0 &&
    (competenciaChart.emitido.some((v) => v > 0) ||
      competenciaChart.recebido.some((v) => v > 0));

  const hasConciliacaoData = conciliacaoChart.values.some((v) => v > 0);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <ComponentCard
        title="Recebimentos por mês de pagamento"
        desc={`Valor emitido vs. recebido no período selecionado (${periodLabel}).`}
      >
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
            title="Sem dados de pagamento"
            description="Não há recebimentos no período selecionado."
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
            title="Nenhum dado disponível"
            description="Cadastre notas e importe extratos para popular o painel."
          />
        )}
      </ComponentCard>
    </div>
  );
}
