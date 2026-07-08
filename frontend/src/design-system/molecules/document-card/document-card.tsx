import { Link } from "react-router-dom";
import { FileText, ChevronRight } from "lucide-react";
import { Badge, Typography } from "@/design-system/atoms";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/design-system/lib/cn";

export type DocumentCardStatus = "ok" | "warning" | "error" | "pending";

const DOC_TYPE_LABELS: Record<string, string> = {
  cte: "Nota de transporte",
  nfe: "Nota fiscal",
  unknown_xml: "Documento",
  unknown: "Outros",
  extrato: "Extrato",
  boleto: "Boleto",
};

function statusVariant(status: DocumentCardStatus) {
  if (status === "ok") return "success" as const;
  if (status === "warning") return "warning" as const;
  if (status === "error") return "danger" as const;
  return "outline" as const;
}

function statusLabel(status: DocumentCardStatus) {
  if (status === "ok") return "Processado";
  if (status === "warning") return "Com aviso";
  if (status === "error") return "Precisa de você";
  return "Pendente";
}

export function DocumentCard({
  id,
  docType,
  title,
  subtitle,
  amount,
  date,
  status,
  to,
  className,
}: {
  id: string;
  docType: string;
  title: string;
  subtitle?: string;
  amount?: number;
  date?: string;
  status: DocumentCardStatus;
  to?: string;
  className?: string;
}) {
  const typeLabel = DOC_TYPE_LABELS[docType] ?? "Documento";
  const content = (
    <article
      className={cn(
        "group flex items-start gap-4 rounded-xl border border-border bg-surface/60 p-4 transition-default hover:border-primary/30 hover:bg-surface",
        to && "cursor-pointer",
        className,
      )}
      aria-labelledby={`doc-${id}-title`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Typography variant="caption" tone="muted">
            {typeLabel}
          </Typography>
          <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
        </div>
        <Typography id={`doc-${id}-title`} variant="subtitle" className="mt-1 truncate">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" tone="muted" className="mt-0.5 block truncate">
            {subtitle}
          </Typography>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-caption text-muted-foreground">
          {amount != null && <span className="tabular-nums font-medium text-foreground">{formatMoney(amount)}</span>}
          {date && <span>{formatDate(date)}</span>}
        </div>
      </div>
      {to && (
        <ChevronRight
          className="mt-2 h-5 w-5 shrink-0 text-muted-foreground transition-default group-hover:text-primary"
          aria-hidden
        />
      )}
    </article>
  );

  if (to) {
    return (
      <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
