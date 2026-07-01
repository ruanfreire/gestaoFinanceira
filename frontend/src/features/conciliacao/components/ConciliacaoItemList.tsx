import Badge from "@ui/components/ui/badge/Badge";
import { formatCurrency, formatDate } from "@/utils/nota-format.util";
import type { ConciliacaoVariant, LancamentoConciliacaoItem } from "../types/conciliacao.types";
import { itemKey } from "../services/conciliacao.service";

type ConciliacaoItemListProps = {
  items: LancamentoConciliacaoItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  variant: ConciliacaoVariant;
};

export function ConciliacaoItemList({
  items,
  selectedKey,
  onSelect,
  variant,
}: ConciliacaoItemListProps) {
  if (items.length === 0) {
    return (
      <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
        Nenhum lançamento nesta fila.
      </p>
    );
  }

  return (
    <ul
      className="divide-y divide-gray-100 dark:divide-gray-800"
      role="listbox"
      aria-label="Lançamentos para conciliação"
    >
      {items.map((item) => {
        const key = itemKey(item);
        const isSelected = selectedKey === key;
        const semNomePix = item.source === "nubank" && !item.lancamento.pagador_nome?.trim();

        return (
          <li key={key} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(key)}
              className={`w-full px-4 py-3 text-left transition-colors ${
                isSelected
                  ? "bg-brand-50 dark:bg-brand-500/10"
                  : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {item.lancamento.pagador_nome || "Pagador não identificado"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                    {item.lancamento.descricao || formatDate(item.lancamento.data)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge color={item.source === "asaas" ? "info" : "primary"} size="sm">
                      {item.source === "asaas" ? "Asaas" : "Nubank"}
                    </Badge>
                    {variant === "sem_match" && (
                      <Badge color="error" size="sm">
                        Sem match
                      </Badge>
                    )}
                    {semNomePix && (
                      <Badge color="warning" size="sm">
                        Pix sem nome
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium tabular-nums">
                    {formatCurrency(item.lancamento.valor)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(item.lancamento.data)}</p>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
