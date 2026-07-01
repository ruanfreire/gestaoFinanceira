import { Link } from "react-router-dom";
import ComponentCard from "@ui/components/common/ComponentCard";
import Badge from "@ui/components/ui/badge/Badge";
import EmptyState from "@ui/components/ui/empty-state/EmptyState";
import { formatCurrency, formatDate } from "@/utils/nota-format.util";
import type { PendingMovement } from "../types/dashboard.types";

type PendingConciliacaoPanelProps = {
  items: PendingMovement[];
};

function sourceLabel(source: PendingMovement["source"]) {
  return source === "nubank" ? "Nubank" : "Asaas";
}

export function PendingConciliacaoPanel({ items }: PendingConciliacaoPanelProps) {
  return (
    <ComponentCard
      title="Movimentações pendentes"
      desc="Lançamentos aguardando vínculo ou análise manual."
    >
      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma pendência"
          description="Todos os lançamentos recentes estão conciliados."
        />
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <li key={item.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {item.pagador || "Pagador não informado"}
                    </p>
                    <Badge color="light" size="sm">
                      {sourceLabel(item.source)}
                    </Badge>
                    {item.variant === "sem_match" ? (
                      <Badge color="error" size="sm">
                        Sem match
                      </Badge>
                    ) : (
                      <Badge color="warning" size="sm">
                        Pendente
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(item.data)} · {formatCurrency(item.valor)}
                    {item.candidatasCount > 0 && ` · ${item.candidatasCount} candidata(s)`}
                  </p>
                </div>
                <Link
                  to={item.variant === "sem_match" ? "/conciliacao/sem-match" : "/conciliacao"}
                  className="shrink-0 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  Resolver
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ComponentCard>
  );
}
