import { memo } from "react";
import { Badge, Typography } from "@/design-system/atoms";
import { VirtualList } from "@/design-system/organisms";
import { cn } from "@/design-system/lib/cn";
import { formatDate, formatMoney, bancoLabel } from "@/lib/format";
import type { LancamentoConciliacaoItem } from "../types";
import { itemKey } from "../api";

const ConciliationQueueRow = memo(function ConciliationQueueRow({
  item,
  active,
  onSelect,
}: {
  item: LancamentoConciliacaoItem;
  active: boolean;
  onSelect: () => void;
}) {
  const topScore = item.candidatas[0]?.match?.totalScore;

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
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
  );
});

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
    <div
      className="divide-y divide-border lg:py-1"
      role="listbox"
      aria-label="Movimentos pendentes"
    >
      <VirtualList
        items={items}
        getKey={(item) => itemKey(item)}
        className="divide-y divide-border"
        renderItem={(item, index) => (
          <div role="presentation" className="border-b border-border-subtle last:border-0">
            <ConciliationQueueRow
              item={item}
              active={itemKey(item) === activeKey}
              onSelect={() => onSelect(index)}
            />
          </div>
        )}
      />
    </div>
  );
}
