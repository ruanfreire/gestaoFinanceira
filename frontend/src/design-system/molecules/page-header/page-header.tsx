import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function PageHeader({
  title,
  description,
  overline,
  actions,
  className,
}: {
  title: string;
  description?: string;
  overline?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 stack-gap gap-1">
        {overline && <Typography variant="overline">{overline}</Typography>}
        <Typography variant="h1" as="h1">
          {title}
        </Typography>
        {description && (
          <Typography variant="body" tone="muted">
            {description}
          </Typography>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
