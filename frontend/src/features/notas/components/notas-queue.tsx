import { Badge, Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import type { Nota } from "../types";

export function NotasQueue({
  items,
  activeId,
  onSelect,
}: {
  items: Nota[];
  activeId: string | null;
  onSelect: (nota: Nota) => void;
}) {
  return (
    <ul className="divide-y divide-border lg:py-1" role="listbox" aria-label="Lista de notas">
      {items.map((nota) => {
        const active = nota._id === activeId;
        return (
          <li key={nota._id} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(nota)}
              className={cn(
                "w-full px-4 py-3 text-left transition-default",
                active ? "bg-accent" : "hover:bg-muted/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Typography variant="subtitle">NF {nota.numero}</Typography>
                  <Typography variant="caption" className="block truncate">
                    {nota.tomador ?? nota.empresa}
                  </Typography>
                  <Typography variant="caption" tone="muted">
                    {formatDate(nota.data_emissao)}
                  </Typography>
                </div>
                <div className="shrink-0 text-right">
                  <Typography variant="small" className="tabular-nums">
                    {formatMoney(nota.valor)}
                  </Typography>
                  <Badge variant={nota.status_pagamento === "pago" ? "success" : "warning"} className="mt-1">
                    {PAYMENT_STATUS_LABELS[nota.status_pagamento ?? ""] ?? nota.status_pagamento}
                  </Badge>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
