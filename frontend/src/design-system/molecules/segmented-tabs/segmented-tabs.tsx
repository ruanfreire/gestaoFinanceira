import { cn } from "@/design-system/lib/cn";

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  className,
  variant = "default",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
  className?: string;
  /** `compact` — toggle inline estilo toolbar (não estica 100%) */
  variant?: "default" | "compact";
}) {
  const compact = variant === "compact";

  return (
    <div
      className={cn(
        compact
          ? "inline-flex max-w-full flex-wrap gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
          : "flex gap-2 rounded-lg bg-muted p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-md font-medium transition-default",
              compact
                ? "h-8 shrink-0 px-3 text-caption"
                : "flex-1 px-3 py-2 text-small",
              active
                ? compact
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-foreground shadow-xs"
                : compact
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
