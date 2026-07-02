import { motion } from "framer-motion";
import { useHomeQuery } from "../hooks";
import { AttentionPanel } from "@/design-system/organisms";
import { ErrorState } from "@/design-system/molecules";
import { KPIGrid } from "@/design-system/organisms";
import { TrendBadge } from "@/design-system/atoms";
import { formatMoney } from "@/lib/format";
import { percentChange } from "@/lib/period-utils";
import { useFadeInMotion } from "@/lib/motion";
import { DashboardHeader } from "../components/dashboard-header";
import { QuickActionsStrip } from "../components/quick-actions-strip";
import { FinanceFlowChart } from "../components/finance-flow-chart";
import { NotaStatusChart } from "../components/nota-status-chart";
import { PendingTasksList } from "../components/pending-tasks-list";
import { RecentImportsList } from "../components/activity-timeline";
import { DashboardSkeleton } from "../components/dashboard-skeleton";
import { MobileQuickActionsBar } from "../components/mobile-quick-actions-bar";
import type { DashboardKpis } from "../api";

function buildKpiItems(kpis: DashboardKpis, previous?: DashboardKpis) {
  const trend = (current: number, prevKey: keyof DashboardKpis, invert = false) => {
    const prev = previous?.[prevKey];
    if (typeof prev !== "number") return undefined;
    const delta = percentChange(current, prev);
    if (delta == null) return undefined;
    return <TrendBadge delta={invert && delta !== 0 ? -delta : delta} />;
  };

  return [
    {
      label: "Valor emitido",
      value: formatMoney(kpis.valorNf),
      trend: trend(kpis.valorNf, "valorNf"),
    },
    {
      label: "Valor recebido",
      value: formatMoney(kpis.valorRecebido),
      trend: trend(kpis.valorRecebido, "valorRecebido"),
    },
    {
      label: "Valor em aberto",
      value: formatMoney(kpis.saldoAberto),
      highlight: kpis.saldoAberto > 0,
      trend: trend(kpis.saldoAberto, "saldoAberto", true),
    },
    {
      label: "% recebido",
      value: `${kpis.percentRecebido.toFixed(1)}%`,
      hint: `${kpis.notasPagas}/${kpis.totalNotas} pagas`,
      trend: trend(kpis.percentRecebido, "percentRecebido"),
    },
    {
      label: "A confirmar",
      value: String(kpis.pendentesConciliacao),
      highlight: kpis.pendentesConciliacao > 0,
      trend: trend(kpis.pendentesConciliacao, "pendentesConciliacao", true),
    },
    {
      label: "Importações",
      value: String(kpis.importsInPeriod),
      trend: trend(kpis.importsInPeriod, "importsInPeriod"),
    },
  ];
}

function Widget({ children, className }: { children: React.ReactNode; className?: string }) {
  const fadeIn = useFadeInMotion(6);
  return (
    <motion.div {...fadeIn} className={className}>
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  const { data, isLoading, isError, filters, setFilters, refetch, previousKpis } = useHomeQuery();
  const pageMotion = useFadeInMotion(4);

  if (isLoading && !data) {
    return (
      <motion.div {...pageMotion}>
        <DashboardHeader
          filters={filters}
          onFiltersChange={setFilters}
          onApplyFilters={() => refetch()}
          loading
        />
        <div className="mt-6">
          <DashboardSkeleton />
        </div>
      </motion.div>
    );
  }

  if (isError && !data) {
    return (
      <motion.div {...pageMotion} className="stack-gap">
        <DashboardHeader
          filters={filters}
          onFiltersChange={setFilters}
          onApplyFilters={() => refetch()}
        />
        <ErrorState message="Não foi possível carregar o início." onRetry={() => refetch()} />
      </motion.div>
    );
  }

  if (!data) {
    return (
      <motion.div {...pageMotion}>
        <DashboardHeader
          filters={filters}
          onFiltersChange={setFilters}
          onApplyFilters={() => refetch()}
          loading
        />
        <div className="mt-6">
          <DashboardSkeleton />
        </div>
      </motion.div>
    );
  }

  const kpiItems = buildKpiItems(data.kpis, previousKpis);

  return (
    <motion.div {...pageMotion} className="space-y-6 pb-20 lg:pb-8">
      <DashboardHeader
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={() => refetch()}
        loading={isLoading}
        dateBasis={data.dateBasis}
      />

      <QuickActionsStrip />

      {data.alerts.length > 0 && (
        <div aria-live="polite">
          <AttentionPanel
            items={data.alerts.map((a) => ({
              id: a.id,
              title: a.title,
              message: a.message,
              link: a.link,
              linkLabel: a.linkLabel,
              type: a.type,
            }))}
          />
        </div>
      )}

      <Widget>
        <section aria-labelledby="dashboard-kpis">
          <h2 id="dashboard-kpis" className="sr-only">
            Indicadores financeiros
          </h2>
          <KPIGrid items={kpiItems} columns={3} carouselOnMobile />
        </section>
      </Widget>

      <div className="grid gap-6 lg:grid-cols-12">
        <Widget className="lg:col-span-8">
          <FinanceFlowChart data={data.competenciaChart} />
        </Widget>
        <Widget className="lg:col-span-4">
          <NotaStatusChart status={data.notaStatus} />
        </Widget>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Widget className="lg:col-span-7">
          <PendingTasksList items={data.pendingMovements} />
        </Widget>
        <Widget className="lg:col-span-5">
          <RecentImportsList items={data.recentImports} />
        </Widget>
      </div>

      <MobileQuickActionsBar />
    </motion.div>
  );
}
