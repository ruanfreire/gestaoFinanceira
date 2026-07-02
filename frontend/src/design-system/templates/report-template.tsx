import { motion } from "framer-motion";
import { PageHeader, ErrorState } from "@/design-system/molecules";
import { Card, CardBody } from "@/design-system/organisms";
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title={title} description={description} className="mb-0 min-w-0 flex-1" />
        {exportAction && <div className="flex shrink-0 items-start">{exportAction}</div>}
      </div>

      {taskGuide}

      <Card>
        <CardBody className="p-4 sm:p-6">{filters}</CardBody>
      </Card>

      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {error && <ErrorState message={error} onRetry={onRetry} />}

      {!loading && !error && (
        <div className="space-y-6">
          {summary}
          {preview}
        </div>
      )}
    </motion.div>
  );
}
