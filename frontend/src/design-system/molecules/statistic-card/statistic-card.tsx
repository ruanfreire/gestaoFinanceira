import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function StatisticCard({
  label,
  value,
  hint,
  highlight,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  highlight?: boolean;
  trend?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[7.5rem] flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-xs transition-default hover:border-border/80 hover:shadow-sm",
        className,
      )}
    >
      <Typography variant="caption" className="leading-snug">
        {label}
      </Typography>
      <div className="mt-3">
        <Typography
          variant="h3"
          className={cn("tabular-nums tracking-tight", highlight && "text-warning")}
          as="p"
        >
          {value}
        </Typography>
        {(trend || hint) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {trend}
            {hint && (
              <Typography variant="caption" tone="muted">
                {hint}
              </Typography>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
