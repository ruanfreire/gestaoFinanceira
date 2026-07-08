import { Sparkles } from "lucide-react";
import { Button, Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function AssistedActionCard({
  title,
  description,
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  onPrimary,
  onSecondary,
  onTertiary,
  loading,
  className,
}: {
  title: string;
  description: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  tertiaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onTertiary?: () => void;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/25 bg-primary-subtle/40 p-5",
        className,
      )}
    >
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <Typography variant="subtitle">{title}</Typography>
            <Typography variant="body" tone="muted" className="mt-1">
              {description}
            </Typography>
          </div>
          <div className="flex flex-wrap gap-2">
            {onPrimary && (
              <Button type="button" size="sm" onClick={onPrimary} loading={loading}>
                {primaryLabel ?? "Sim, confirmar"}
              </Button>
            )}
            {onSecondary && (
              <Button type="button" size="sm" variant="outline" onClick={onSecondary}>
                {secondaryLabel ?? "Não é essa"}
              </Button>
            )}
            {onTertiary && (
              <Button type="button" size="sm" variant="ghost" onClick={onTertiary}>
                {tertiaryLabel ?? "Decidir depois"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
