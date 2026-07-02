import { Clock, ListChecks, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Typography, Button } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export type TaskGuideProps = {
  goal: string;
  steps: ReadonlyArray<string>;
  minutes?: number;
  currentStep?: number;
  className?: string;
};

export function TaskGuide({ goal, steps, minutes = 3, currentStep, className }: TaskGuideProps) {
  return (
    <aside
      className={cn(
        "rounded-xl border border-primary/20 bg-primary-subtle p-4 sm:p-5",
        className,
      )}
      aria-label="Guia da tarefa"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ListChecks className="h-4 w-4 text-foreground" aria-hidden />
        <Typography variant="overline" className="text-foreground">
          Sua tarefa agora
        </Typography>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-caption text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden />
          até {minutes} min
        </span>
      </div>
      <Typography variant="subtitle" className="mt-2">
        {goal}
      </Typography>
      <ol className="mt-3 space-y-2">
        {steps.map((step, i) => {
          const active = currentStep === undefined ? false : i === currentStep;
          const done = currentStep !== undefined && i < currentStep;
          return (
            <li
              key={step}
              className={cn(
                "flex gap-2 text-small",
                active && "font-medium text-foreground",
                done && "text-muted-foreground line-through",
                !active && !done && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-caption font-semibold",
                  active && "bg-primary text-primary-foreground",
                  done && "bg-success text-success-foreground",
                  !active && !done && "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {done ? "✓" : i + 1}
              </span>
              {step}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

export function NextStepBanner({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionTo?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-success/30 bg-success-subtle p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div>
        <Typography variant="subtitle" className="text-success">
          {title}
        </Typography>
        <Typography variant="body" tone="muted" className="mt-1">
          {description}
        </Typography>
      </div>
      {actionTo ? (
        <Button asChild className="mt-3 shrink-0 sm:mt-0">
          <Link to={actionTo}>
            {actionLabel}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button className="mt-3 shrink-0 sm:mt-0" onClick={onAction}>
          {actionLabel}
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </Button>
      )}
    </div>
  );
}

export function StepHint({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body" tone="muted" className="rounded-lg bg-surface-sunken px-3 py-2">
      {children}
    </Typography>
  );
}
