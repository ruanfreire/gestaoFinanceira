import { Check } from "lucide-react";
import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export type TimelineStep = {
  id: string;
  label: string;
  description?: string;
  done?: boolean;
  current?: boolean;
};

export function RelationshipTimeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  if (!steps.length) return null;

  return (
    <ol className={cn("relative space-y-0", className)} aria-label="Histórico do documento">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border"
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                step.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : step.current
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-border bg-surface text-muted-foreground",
              )}
              aria-hidden
            >
              {step.done ? <Check className="h-4 w-4" /> : <span className="text-caption font-medium">{index + 1}</span>}
            </span>
            <div className="min-w-0 pt-0.5">
              <Typography variant="subtitle">{step.label}</Typography>
              {step.description && (
                <Typography variant="caption" tone="muted" className="mt-0.5 block">
                  {step.description}
                </Typography>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
