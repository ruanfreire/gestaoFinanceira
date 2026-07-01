import MetricCard from "@ui/components/metrics/MetricCard";
import { DollarLineIcon, FileIcon, TimeIcon } from "@ui/icons";
import { formatCurrency } from "@/utils/nota-format.util";
import type { ExtracaoNotasResponse } from "../types/relatorios.types";

export function ExtracaoNotasMetrics({ totais }: { totais: ExtracaoNotasResponse["totais"] }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <MetricCard
        label="Total NF"
        value={formatCurrency(totais.valor_nf)}
        icon={<FileIcon className="size-6 text-brand-500" />}
      />
      <MetricCard
        label="Total pago"
        value={formatCurrency(totais.valor_pago)}
        icon={<DollarLineIcon className="size-6 text-success-500" />}
      />
      <MetricCard
        label="Saldo em aberto"
        value={formatCurrency(totais.saldo_aberto)}
        icon={<TimeIcon className="size-6 text-amber-500" />}
      />
    </div>
  );
}
