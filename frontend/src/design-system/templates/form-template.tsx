import { motion } from "framer-motion";
import { PageHeader } from "@/design-system/molecules";
import { Card, CardBody } from "@/design-system/organisms";

export function FormTemplate({
  title,
  description,
  taskGuide,
  actions,
  error,
  children,
}: {
  title: string;
  description?: string;
  taskGuide?: React.ReactNode;
  actions?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader title={title} description={description} actions={actions} />
      {taskGuide && <div className="mb-4">{taskGuide}</div>}
      {error}
      <Card className="mt-4">
        <CardBody>{children}</CardBody>
      </Card>
    </motion.div>
  );
}
