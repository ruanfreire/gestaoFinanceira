import { motion } from "framer-motion";
import { PageHeader } from "@/design-system/molecules";
import { Card, CardBody, Wizard } from "@/design-system/organisms";
import { Typography } from "@/design-system/atoms";

export function WizardTemplate({
  title,
  description,
  steps,
  currentStep,
  stepDescription,
  taskGuide,
  stepHint,
  children,
}: {
  title: string;
  description?: string;
  steps: { id: string; label: string }[];
  currentStep: number;
  stepDescription?: string;
  taskGuide?: React.ReactNode;
  stepHint?: React.ReactNode;
  children: React.ReactNode;
}) {
  const activeLabel = steps[currentStep]?.label;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={title} description={description} />
      {taskGuide && <div>{taskGuide}</div>}
      <Card>
        <CardBody className="space-y-5 p-4 sm:p-6">
          <div className="space-y-3 border-b border-border pb-4">
            <Wizard steps={steps} currentStep={currentStep} />
            {stepDescription && (
              <Typography variant="body" tone="muted">
                {stepDescription}
              </Typography>
            )}
            {!stepDescription && activeLabel && (
              <Typography variant="overline" className="text-muted-foreground">
                Passo {currentStep + 1} — {activeLabel}
              </Typography>
            )}
          </div>
          {stepHint && <div>{stepHint}</div>}
          {children}
        </CardBody>
      </Card>
    </motion.div>
  );
}

function WizardStepFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end ${className ?? ""}`}>
      {children}
    </div>
  );
}

WizardTemplate.Footer = WizardStepFooter;
