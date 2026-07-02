import { motion } from "framer-motion";
import { PageHeader } from "@/design-system/molecules";
import { ErrorState } from "@/design-system/molecules";
import { Skeleton } from "@/design-system/atoms";

export function ListTemplate({
  title,
  description,
  taskGuide,
  actions,
  filters,
  loading,
  error,
  onRetry,
  children,
}: {
  title: string;
  description?: string;
  taskGuide?: React.ReactNode;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      <PageHeader title={title} description={description} actions={actions} />
      {taskGuide && <div className="mb-4">{taskGuide}</div>}
      {filters}
      {loading && <Skeleton className="mt-4 h-40 w-full" />}
      {error && <ErrorState className="mt-4" message={error} onRetry={onRetry} />}
      {!loading && !error && <div className="mt-4 stack-gap">{children}</div>}
    </motion.div>
  );
}
