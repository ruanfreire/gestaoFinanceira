import ComponentCard from "@ui/components/common/ComponentCard";
import type { ImportacaoExtrato } from "../types/importacao-extrato.types";
import { bancoLabel, formatDateTime } from "../utils/importacao-extrato-display.util";

type TimelineEvent = {
  id: string;
  title: string;
  description?: string;
  time?: string;
  variant: "default" | "success" | "error" | "warning";
};

function buildTimelineEvents(importacao: ImportacaoExtrato): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "created",
      title: "Extrato recebido",
      description: `${bancoLabel(importacao.banco)} · ${importacao.originalName || importacao.filename}`,
      time: importacao.createdAt,
      variant: "default",
    },
  ];

  if (importacao.status === "processing") {
    events.push({
      id: "processing",
      title: "Processando extrato",
      description: "Lendo lançamentos e executando conciliação automática.",
      variant: "warning",
    });
  }

  if (importacao.status === "finished" || importacao.status === "completed" || !importacao.status) {
    const stats = importacao.stats;
    events.push({
      id: "finished",
      title: "Importação processada",
      description: `${stats?.imported ?? 0} nova(s) · ${stats?.conciliado_auto ?? 0} conciliada(s) auto · ${stats?.pendente_vinculo ?? 0} pendente(s)`,
      time: importacao.finishedAt,
      variant: "success",
    });
  }

  if (importacao.status === "failed") {
    events.push({
      id: "failed",
      title: "Importação falhou",
      description: importacao.errorMessage || "Erro durante o processamento.",
      time: importacao.finishedAt,
      variant: "error",
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

export function ImportacaoExtratoTimeline({ importacao }: { importacao: ImportacaoExtrato }) {
  const events = buildTimelineEvents(importacao);

  return (
    <ComponentCard title="Linha do tempo" desc="Eventos desta importação bancária.">
      <ol className="relative space-y-6 border-l border-gray-200 pl-6 dark:border-gray-800">
        {events.map((event) => (
          <li key={event.id} className="relative">
            <span
              className={`absolute -left-[1.9rem] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-gray-900 ${dotClass[event.variant]}`}
            />
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{event.title}</p>
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
