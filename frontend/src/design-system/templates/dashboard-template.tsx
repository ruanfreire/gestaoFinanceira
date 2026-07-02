import { motion } from "framer-motion";
import { PageHeader } from "@/design-system/molecules";
import { ErrorState } from "@/design-system/molecules";
import { Skeleton } from "@/design-system/atoms";

export function DashboardTemplate({
  title,
  description,
  taskGuide,
  loading,
  error,
  onRetry,
  attention,
  quickActions,
  filters,
  kpis,
  timeline,
  children,
}: {
  title: string;
  description?: string;
  taskGuide?: React.ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  attention?: React.ReactNode;
  quickActions?: React.ReactNode;
  filters?: React.ReactNode;
  kpis?: React.ReactNode;
  timeline?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <PageHeader title={title} description={description} />
      {taskGuide && <div className="mb-4">{taskGuide}</div>}
      {loading && (
        <div className="stack-gap">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (
        <div className="stack-gap section-gap">
          {attention}
          {quickActions}
          {filters}
          {kpis}
          {timeline}
          {children}
        </div>
      )}
    </motion.div>
  );
}
