import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function MatchScore({
  score,
  label = "Compatibilidade",
  className,
}: {
  score: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100);
  const tone = pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-muted-foreground";

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <Typography variant="caption" tone="muted">
          {label}
        </Typography>
        <Typography variant="caption" className="font-medium tabular-nums">
          {pct}%
        </Typography>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct}%`}
      >
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
