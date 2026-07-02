import { motion } from "framer-motion";
import { PageHeader, ErrorState } from "@/design-system/molecules";
import { Skeleton } from "@/design-system/atoms";

export function ReportTemplate({
  title,
  description,
  taskGuide,
  filters,
  summary,
  preview,
  exportAction,
  loading,
  error,
  onRetry,
}: {
  title: string;
  description?: string;
  taskGuide?: React.ReactNode;
  filters: React.ReactNode;
  summary?: React.ReactNode;
  preview?: React.ReactNode;
  exportAction?: React.ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stack-gap section-gap">
      <PageHeader title={title} description={description} />
      {taskGuide && <div className="mb-4">{taskGuide}</div>}
      {filters}
      {loading && (
        <div className="stack-gap">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (
        <>
          {summary}
          {preview}
          {exportAction}
        </>
      )}
    </motion.div>
  );
}
