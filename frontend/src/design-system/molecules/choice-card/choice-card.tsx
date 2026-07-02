import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function ChoiceCard({
  title,
  description,
  selected,
  onClick,
  className,
}: {
  title: string;
  description?: string;
  selected?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-4 text-left transition-default sm:p-6",
        selected
          ? "border-primary bg-primary-subtle"
          : "border-border hover:border-primary hover:bg-primary-subtle/30",
        className,
      )}
    >
      <Typography variant="subtitle">{title}</Typography>
      {description && (
        <Typography variant="caption" className="mt-1 block">
          {description}
        </Typography>
      )}
    </button>
  );
}

export function ChoiceCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 sm:grid-cols-2", className)}>{children}</div>;
}
