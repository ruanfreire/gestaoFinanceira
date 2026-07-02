import { cn } from "@/design-system/lib/cn";

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2 rounded-lg bg-muted p-1", className)} role="tablist">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-small font-medium transition-default",
              active ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
