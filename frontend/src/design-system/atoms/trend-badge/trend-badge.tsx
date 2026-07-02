import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function TrendBadge({
  delta,
  label = "vs período anterior",
  className,
}: {
  delta: number | null | undefined;
  label?: string;
  className?: string;
}) {
  if (delta == null || Number.isNaN(delta) || Math.abs(delta) > 150) return null;

  const flat = Math.abs(delta) < 0.5;
  const positive = delta > 0;
  const Icon = flat ? Minus : positive ? TrendingUp : TrendingDown;
  const tone = flat ? "muted" : positive ? "success" : "danger";

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={label}
      aria-label={`${flat ? "Estável" : positive ? "Alta" : "Queda"} de ${Math.abs(delta).toFixed(1)}% ${label}`}
    >
      <Icon className={cn("h-3.5 w-3.5", flat && "text-muted-foreground", positive && !flat && "text-success", !positive && !flat && "text-danger")} aria-hidden />
      <Typography variant="caption" tone={tone as "muted" | "success" | "danger"} className="tabular-nums">
        {flat ? "—" : `${positive ? "+" : ""}${delta.toFixed(1)}%`}
      </Typography>
    </span>
  );
}
