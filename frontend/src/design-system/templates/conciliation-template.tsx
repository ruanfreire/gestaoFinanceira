import { motion } from "framer-motion";
import { PageHeader, ErrorState } from "@/design-system/molecules";
import { Skeleton } from "@/design-system/atoms";

export function ConciliationTemplate({
  title,
  description,
  taskGuide,
  tabs,
  loading,
  error,
  onRetry,
  children,
}: {
  title: string;
  description?: string;
  taskGuide?: React.ReactNode;
  tabs: React.ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader title={title} description={description} />
      {taskGuide && <div className="mb-4">{taskGuide}</div>}
      {tabs}
      {loading && (
        <div className="mt-4 stack-gap">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}
      {error && <ErrorState className="mt-4" message={error} onRetry={onRetry} />}
      {!loading && !error && <div className="mt-4">{children}</div>}
    </motion.div>
  );
}
