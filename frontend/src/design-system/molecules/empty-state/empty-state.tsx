import { Button, Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-sunken px-6 py-12 text-center",
        className,
      )}
    >
      <Typography variant="title">{title}</Typography>
      <Typography variant="body" tone="muted" className="mt-2 max-w-sm">
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
