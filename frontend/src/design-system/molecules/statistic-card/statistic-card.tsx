import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function StatisticCard({
  label,
  value,
  hint,
  highlight,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-4 shadow-xs transition-default hover:shadow-sm",
        className,
      )}
    >
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      <Typography
        variant="h3"
        className={cn("mt-1 tabular-nums", highlight && "text-warning")}
        as="p"
      >
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" tone="muted" className="mt-1">
          {hint}
        </Typography>
      )}
    </div>
  );
}
