import { Check } from "lucide-react";
import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

type Step = { id: string; label: string };

export function Wizard({ steps, currentStep, className }: { steps: Step[]; currentStep: number; className?: string }) {
  return (
    <nav className={cn("flex items-center gap-2 overflow-x-auto pb-2", className)} aria-label="Progresso do assistente">
      {steps.map((step, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return (
          <div key={step.id} className="flex min-w-0 items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption font-semibold transition-default",
                done && "bg-success text-success-foreground",
                active && "bg-primary text-primary-foreground",
                !done && !active && "bg-muted text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <Typography variant="small" tone={active ? "default" : "muted"} className="hidden truncate sm:inline">
              {step.label}
            </Typography>
            {index < steps.length - 1 && <div className="mx-1 hidden h-px w-6 bg-border sm:block" />}
          </div>
        );
      })}
    </nav>
  );
}
