import { Link } from "react-router-dom";
import ComponentCard from "@ui/components/common/ComponentCard";
import Badge from "@ui/components/ui/badge/Badge";
import EmptyState from "@ui/components/ui/empty-state/EmptyState";
import { DownloadIcon, DollarLineIcon } from "@ui/icons";
import type { RecentImport } from "../types/dashboard.types";

type RecentImportsPanelProps = {
  items: RecentImport[];
};

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}

function statusBadge(status?: string) {
  if (status === "finished") return <Badge color="success" size="sm">Concluída</Badge>;
  if (status === "failed") return <Badge color="error" size="sm">Falhou</Badge>;
  if (status === "processing") return <Badge color="warning" size="sm">Processando</Badge>;
  return null;
}

export function RecentImportsPanel({ items }: RecentImportsPanelProps) {
  return (
    <ComponentCard title="Importações recentes" desc="Últimas importações de faturas e extratos.">
      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma importação"
          description="Envie arquivos JSON ou CSV para começar."
          icon={<DownloadIcon className="size-6" />}
        />
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => {
            const Icon = item.kind === "fatura" ? DownloadIcon : DollarLineIcon;
            return (
              <li key={item.id}>
                <Link
                  to={item.link}
                  className="flex items-start gap-3 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-lg"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                        {item.title}
                      </p>
                      {statusBadge(item.status)}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ComponentCard>
  );
}
