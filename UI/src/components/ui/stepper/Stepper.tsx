import { ReactNode } from "react";

export type StepperStep = {
  id: string;
  label: string;
  description?: string;
};

type StepperProps = {
  steps: StepperStep[];
  currentStepId: string;
  className?: string;
  /** Etapas anteriores à atual são marcadas como concluídas */
  completedStepIds?: string[];
  orientation?: "horizontal" | "vertical";
};

export function Stepper({
  steps,
  currentStepId,
  className = "",
  completedStepIds = [],
  orientation = "horizontal",
}: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  const getStatus = (step: StepperStep, index: number) => {
    if (completedStepIds.includes(step.id) || index < currentIndex) return "completed";
    if (step.id === currentStepId) return "current";
    return "upcoming";
  };

  const isVertical = orientation === "vertical";

  return (
    <nav aria-label="Progresso" className={className}>
      <ol
        className={
          isVertical
            ? "flex flex-col gap-4"
            : "flex flex-wrap items-start gap-2 sm:gap-0 sm:justify-between"
        }
      >
        {steps.map((step, index) => {
          const status = getStatus(step, index);
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              className={
                isVertical
                  ? "flex gap-3"
                  : `flex flex-1 min-w-[120px] items-center ${!isLast ? "sm:pr-4" : ""}`
              }
            >
              <div className={isVertical ? "flex flex-col items-center" : "flex items-center w-full"}>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      status === "completed"
                        ? "bg-brand-500 text-white"
                        : status === "current"
                          ? "border-2 border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                          : "border border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900"
                    }`}
                    aria-current={status === "current" ? "step" : undefined}
                  >
                    {status === "completed" ? (
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        status === "upcoming"
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-800 dark:text-white/90"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
                    )}
                  </div>
                </div>
                {!isLast && !isVertical && (
                  <div
                    className="mx-3 hidden h-px flex-1 bg-gray-200 dark:bg-gray-800 sm:block"
                    aria-hidden="true"
                  />
                )}
              </div>
              {!isLast && isVertical && (
                <div className="ml-4 h-full w-px self-stretch bg-gray-200 dark:bg-gray-800" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
