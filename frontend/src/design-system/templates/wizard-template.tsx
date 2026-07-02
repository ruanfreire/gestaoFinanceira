import { motion } from "framer-motion";
import { PageHeader } from "@/design-system/molecules";
import { Wizard } from "@/design-system/organisms";

export function WizardTemplate({
  title,
  description,
  steps,
  currentStep,
  taskGuide,
  stepHint,
  children,
}: {
  title: string;
  description?: string;
  steps: { id: string; label: string }[];
  currentStep: number;
  taskGuide?: React.ReactNode;
  stepHint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader title={title} description={description} />
      {taskGuide && <div className="mb-4">{taskGuide}</div>}
      <Wizard steps={steps} currentStep={currentStep} className="mb-4" />
      {stepHint && <div className="mb-4">{stepHint}</div>}
      {children}
    </motion.div>
  );
}
