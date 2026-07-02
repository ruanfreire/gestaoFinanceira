import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "@ui/components/ui/button/Button";
import { PageHeader } from "@/shared/components/PageHeader";
import { QueryErrorAlert } from "@/shared/components/QueryErrorAlert";
import { useDashboardQuery } from "../hooks/useDashboardQuery";
import { DashboardAlerts } from "../components/DashboardAlerts";
import { DashboardCharts } from "../components/DashboardCharts";
import {
  createDefaultDashboardFilters,
  DashboardFiltersBar,
} from "../components/DashboardFiltersBar";
import { DashboardMetrics } from "../components/DashboardMetrics";
import { DashboardQuickActions } from "../components/DashboardQuickActions";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { PendingConciliacaoPanel } from "../components/PendingConciliacaoPanel";
import { RecentImportsPanel } from "../components/RecentImportsPanel";
import type { DashboardFilters } from "../types/dashboard.types";
import { formatDashboardPeriodLabel } from "../utils/dashboard-period.util";

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(createDefaultDashboardFilters);
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardQuery(filters);
  const periodLabel = formatDashboardPeriodLabel(filters, data?.dateBasis);

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
        <QueryErrorAlert
          error={error}
          title="Não foi possível carregar o painel"
          fallbackMessage="Erro ao buscar dados do dashboard."
          onRetry={() => refetch()}
        />
      </>
    );
  }

  const hasCriticalAlerts = data.alerts.some((a) => a.type === "error" || a.type === "warning");

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Visão executiva para ${periodLabel}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} loading={isFetching}>
              {isFetching ? "Atualizando…" : "Atualizar"}
            </Button>
            <Link to="/conciliacao">
              <Button size="sm">Conciliar</Button>
            </Link>
          </div>
        }
      />

      <div className="min-w-0 space-y-6">
        <DashboardFiltersBar filters={filters} onApply={setFilters} loading={isFetching} />
        <DashboardMetrics kpis={data.kpis} />

        {hasCriticalAlerts && <DashboardAlerts alerts={data.alerts} />}

        <DashboardQuickActions />

        <DashboardCharts
          competenciaChart={data.competenciaChart}
          conciliacaoChart={data.conciliacaoChart}
          periodLabel={periodLabel}
          dateBasis={data.dateBasis}
        />

        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
          {!hasCriticalAlerts && <DashboardAlerts alerts={data.alerts} />}
          <div className={`min-w-0 space-y-6 ${hasCriticalAlerts ? "xl:col-span-3" : "xl:col-span-2"}`}>
            <PendingConciliacaoPanel items={data.pendingMovements} />
            <RecentImportsPanel items={data.recentImports} />
          </div>
        </div>
      </div>
    </>
  );
}
