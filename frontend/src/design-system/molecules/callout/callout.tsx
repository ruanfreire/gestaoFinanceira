import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

const variants = {
  info: "border-border bg-surface-sunken",
  success: "border-success/30 bg-success-subtle",
  warning: "border-warning/30 bg-warning-subtle",
  danger: "border-danger/30 bg-danger-subtle",
} as const;

export function Callout({
  title,
  children,
  variant = "info",
  className,
}: {
  title?: string;
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border p-4", variants[variant], className)}>
      {title && <Typography variant="subtitle">{title}</Typography>}
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}
