import { useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@ui/components/ui/alert/Alert";
import Button from "@ui/components/ui/button/Button";
import { PageHeader } from "@/shared/components/PageHeader";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { useDashboardQuery } from "../hooks/useDashboardQuery";
import { DashboardAlerts } from "../components/DashboardAlerts";
import { DashboardCharts } from "../components/DashboardCharts";
import {
  createDefaultDashboardFilters,
  DashboardFiltersBar,
} from "../components/DashboardFiltersBar";
import { DashboardMetrics } from "../components/DashboardMetrics";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { PendingConciliacaoPanel } from "../components/PendingConciliacaoPanel";
import { RecentImportsPanel } from "../components/RecentImportsPanel";
import type { DashboardFilters } from "../types/dashboard.types";
import { formatDashboardPeriodLabel } from "../utils/dashboard-period.util";

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(createDefaultDashboardFilters);
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardQuery(filters);
  const periodLabel = formatDashboardPeriodLabel(filters);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Visão executiva de recebíveis, conciliação e importações."
        />
        <DashboardFiltersBar filters={filters} onApply={setFilters} loading={isFetching} />
        <Alert
          variant="error"
          title="Não foi possível carregar o painel"
          message={getApiErrorMessage(error, "Erro ao buscar dados do dashboard.")}
        />
        <div className="mt-4">
          <Button onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Visão executiva para ${periodLabel}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Atualizando…" : "Atualizar"}
            </Button>
            <Link to="/conciliacao">
              <Button size="sm">Conciliar</Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        <DashboardFiltersBar filters={filters} onApply={setFilters} loading={isFetching} />

        <DashboardMetrics kpis={data.kpis} />
        <DashboardCharts
          competenciaChart={data.competenciaChart}
          conciliacaoChart={data.conciliacaoChart}
          periodLabel={periodLabel}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <DashboardAlerts alerts={data.alerts} />
          <div className="xl:col-span-2 space-y-6">
            <RecentImportsPanel items={data.recentImports} />
            <PendingConciliacaoPanel items={data.pendingMovements} />
          </div>
        </div>
      </div>
    </>
  );
}
