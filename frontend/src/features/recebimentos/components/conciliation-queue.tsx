import { Badge, Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";
import { formatDate, formatMoney, bancoLabel } from "@/lib/format";
import type { LancamentoConciliacaoItem } from "../types";
import { itemKey } from "../api";

export function ConciliationQueue({
  items,
  activeKey,
  onSelect,
}: {
  items: LancamentoConciliacaoItem[];
  activeKey: string | null;
  onSelect: (index: number) => void;
}) {
  return (
    <ul className="divide-y divide-border lg:py-1" role="listbox" aria-label="Movimentos pendentes">
      {items.map((item, index) => {
        const key = itemKey(item);
        const active = key === activeKey;
        const topScore = item.candidatas[0]?.match?.totalScore;

        return (
          <li key={key} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(index)}
              className={cn(
                "w-full px-4 py-3 text-left transition-default",
                active ? "bg-accent" : "hover:bg-muted/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {bancoLabel(item.source)}
                    </Badge>
                    <Typography variant="subtitle" className="tabular-nums">
                      {formatMoney(item.lancamento.valor)}
                    </Typography>
                  </div>
                  <Typography variant="caption" className="mt-0.5 block truncate">
                    {item.lancamento.pagador_nome || item.lancamento.descricao || "—"}
                  </Typography>
                  <Typography variant="caption" tone="muted">
                    {formatDate(item.lancamento.data)}
                  </Typography>
                </div>
                {topScore != null && (
                  <Typography variant="caption" className="shrink-0 font-medium text-success">
                    {Math.round(topScore * 100)}%
                  </Typography>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
