import { ReactNode } from "react";
import { Stepper, type StepperStep } from "@ui/components/ui/stepper/Stepper";
import ComponentCard from "@ui/components/common/ComponentCard";

type ImportWizardProps = {
  title: string;
  description?: string;
  steps: StepperStep[];
  currentStepId: string;
  completedStepIds?: string[];
  children: ReactNode;
};

export function ImportWizard({
  title,
  description,
  steps,
  currentStepId,
  completedStepIds = [],
  children,
}: ImportWizardProps) {
  return (
    <div className="space-y-6">
      <ComponentCard title={title} desc={description}>
        <Stepper steps={steps} currentStepId={currentStepId} completedStepIds={completedStepIds} />
      </ComponentCard>
      {children}
    </div>
  );
}
