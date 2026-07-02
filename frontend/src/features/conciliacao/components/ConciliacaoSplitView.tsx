import { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton from "@ui/components/ui/skeleton/Skeleton";
import EmptyState from "@ui/components/ui/empty-state/EmptyState";
import Button from "@ui/components/ui/button/Button";
import { ConciliacaoItemList } from "./ConciliacaoItemList";
import { ConciliacaoLancamentoCard } from "./ConciliacaoLancamentoCard";
import { useConciliacaoKeyboard } from "../hooks/useConciliacaoKeyboard";
import { itemKey } from "../services/conciliacao.service";
import type { ConciliacaoVariant, LancamentoConciliacaoItem } from "../types/conciliacao.types";

type ConciliacaoSplitViewProps = {
  items: LancamentoConciliacaoItem[];
  loading?: boolean;
  variant: ConciliacaoVariant;
  onLinked: () => void;
  emptyTitle: string;
  emptyDescription: string;
};

export function ConciliacaoSplitView({
  items,
  loading,
  variant,
  onLinked,
  emptyTitle,
  emptyDescription,
}: ConciliacaoSplitViewProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const keys = useMemo(() => items.map(itemKey), [items]);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedKey(null);
      setMobileShowDetail(false);
      return;
    }
    if (!selectedKey || !keys.includes(selectedKey)) {
      setSelectedKey(keys[0]);
    }
  }, [items, keys, selectedKey]);

  const selectedItem = items.find((item) => itemKey(item) === selectedKey) ?? null;
  const selectedIndex = selectedKey ? keys.indexOf(selectedKey) : -1;

  const goNext = useCallback(() => {
    if (keys.length === 0) return;
    const next = Math.min(selectedIndex + 1, keys.length - 1);
    setSelectedKey(keys[next]);
    setMobileShowDetail(true);
  }, [keys, selectedIndex]);

  const goPrev = useCallback(() => {
    if (keys.length === 0) return;
    const prev = Math.max(selectedIndex - 1, 0);
    setSelectedKey(keys[prev]);
    setMobileShowDetail(true);
  }, [keys, selectedIndex]);

  useConciliacaoKeyboard({ onNext: goNext, onPrev: goPrev });

  if (loading) {
    return (
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
      <section
        aria-label="Lista de lançamentos"
        className={`min-w-0 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${
          mobileShowDetail ? "hidden lg:block" : "block"
        }`}
      >
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {items.length} lançamento(s)
          </p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <ConciliacaoItemList
            items={items}
            selectedKey={selectedKey}
            onSelect={(key) => {
              setSelectedKey(key);
              setMobileShowDetail(true);
            }}
            variant={variant}
          />
        </div>
      </section>

      <section
        aria-label="Detalhe do lançamento"
        className={`min-w-0 ${mobileShowDetail ? "block" : "hidden lg:block"}`}
      >
        {selectedItem && (
          <>
            <div className="mb-3 lg:hidden">
              <Button variant="outline" size="sm" onClick={() => setMobileShowDetail(false)}>
                ← Voltar à lista
              </Button>
            </div>
            <ConciliacaoLancamentoCard
              key={itemKey(selectedItem)}
              item={selectedItem}
              onLinked={onLinked}
              variant={variant}
            />
          </>
        )}
      </section>
    </div>
  );
}
