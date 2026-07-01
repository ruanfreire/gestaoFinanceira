import ComponentCard from "@ui/components/common/ComponentCard";
import type { ImportacaoFatura } from "../types/importacao-fatura.types";
import { formatDateTime } from "../utils/importacao-display.util";
import { ImportacaoFaturaStatusBadge } from "./ImportacaoFaturaStatusBadge";

type TimelineEvent = {
  id: string;
  title: string;
  description?: string;
  time?: string;
  variant: "default" | "success" | "error" | "warning";
};

function buildTimelineEvents(importacao: ImportacaoFatura): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "created",
      title: "Arquivo recebido",
      description: importacao.originalName || importacao.filename,
      time: importacao.createdAt,
      variant: "default",
    },
  ];

  if (importacao.status === "processing") {
    events.push({
      id: "processing",
      title: "Processando importação",
      description: "Sincronizando faturas com o cadastro de notas.",
      variant: "warning",
    });
  }

  if (importacao.status === "finished") {
    events.push({
      id: "finished",
      title: "Importação concluída",
      description: `${importacao.stats?.imported ?? 0} nova(s), ${importacao.stats?.updated ?? 0} atualizada(s), ${importacao.stats?.ignored ?? 0} ignorada(s)`,
      time: importacao.finishedAt,
      variant: "success",
    });
  }

  if (importacao.status === "failed") {
    events.push({
      id: "failed",
      title: "Importação falhou",
      description: importacao.errorMessage || "Erro desconhecido durante o processamento.",
      time: importacao.finishedAt,
      variant: "error",
    });
  }

  if (importacao.processingTimeMs != null && importacao.status === "finished") {
    events.push({
      id: "perf",
      title: "Tempo de processamento",
      description: `${importacao.processingTimeMs} ms`,
      variant: "default",
    });
  }

  return events;
}

const dotClass: Record<TimelineEvent["variant"], string> = {
  default: "bg-gray-400",
  success: "bg-success-500",
  error: "bg-error-500",
  warning: "bg-warning-500",
};

export function ImportacaoTimeline({ importacao }: { importacao: ImportacaoFatura }) {
  const events = buildTimelineEvents(importacao);

  return (
    <ComponentCard title="Linha do tempo" desc="Eventos desta importação.">
      <ol className="relative space-y-6 border-l border-gray-200 pl-6 dark:border-gray-800">
        {events.map((event) => (
          <li key={event.id} className="relative">
            <span
              className={`absolute -left-[1.9rem] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-gray-900 ${dotClass[event.variant]}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{event.title}</p>
              {event.id === "finished" || event.id === "failed" || event.id === "processing" ? (
                <ImportacaoFaturaStatusBadge status={importacao.status} />
              ) : null}
            </div>
            {event.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{event.description}</p>
            )}
            {event.time && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {formatDateTime(event.time)}
              </p>
            )}
          </li>
        ))}
      </ol>
    </ComponentCard>
  );
}
