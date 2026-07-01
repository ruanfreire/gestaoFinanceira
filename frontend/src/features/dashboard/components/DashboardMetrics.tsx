import MetricCard from "@ui/components/metrics/MetricCard";
import Badge from "@ui/components/ui/badge/Badge";
import {
  CheckCircleIcon,
  DollarLineIcon,
  FileIcon,
  TimeIcon,
} from "@ui/icons";
import { formatCurrency } from "@/utils/nota-format.util";
import type { DashboardData } from "../types/dashboard.types";

type DashboardMetricsProps = {
  kpis: DashboardData["kpis"];
};

export function DashboardMetrics({ kpis }: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
      <MetricCard
        label="Valor total (NF)"
        value={formatCurrency(kpis.valorNf)}
        icon={<FileIcon className="size-6 text-brand-500" />}
        footer={
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {kpis.totalNotas} nota(s) no período
          </span>
        }
      />
      <MetricCard
        label="Recebido"
        value={formatCurrency(kpis.valorRecebido)}
        icon={<DollarLineIcon className="size-6 text-success-500" />}
        footer={
          <Badge color="success" size="sm">
            {kpis.notasPagas} paga(s)
          </Badge>
        }
      />
      <MetricCard
        label="Em aberto"
        value={formatCurrency(kpis.saldoAberto)}
        icon={<TimeIcon className="size-6 text-amber-500" />}
        footer={
          <Badge color="warning" size="sm">
            {kpis.notasEmAberto} nota(s)
          </Badge>
        }
      />
      <MetricCard
        label="Conciliação"
        value={kpis.pendentesConciliacao + kpis.semMatch}
        icon={<CheckCircleIcon className="size-6 text-blue-light-500" />}
        footer={
          <div className="flex flex-wrap gap-2">
            <Badge color="info" size="sm">
              {kpis.pendentesConciliacao} pendente(s)
            </Badge>
            {kpis.semMatch > 0 && (
              <Badge color="error" size="sm">
                {kpis.semMatch} sem match
              </Badge>
            )}
          </div>
        }
      />
    </div>
  );
}
