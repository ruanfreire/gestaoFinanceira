import { Button } from "@/design-system/atoms";
import { CompactPeriodToolbar } from "@/design-system/molecules";
import type { PeriodFilterValue } from "@/design-system/molecules";

export function DashboardPeriodToolbar({
  value,
  onChange,
  onApply,
  loading,
}: {
  value: PeriodFilterValue;
  onChange: (next: PeriodFilterValue) => void;
  onApply: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <CompactPeriodToolbar value={value} onChange={onChange} idPrefix="dashboard" />
      <Button type="button" size="sm" className="h-9 w-full sm:w-auto" onClick={onApply} loading={loading}>
        Atualizar
      </Button>
    </div>
  );
}
