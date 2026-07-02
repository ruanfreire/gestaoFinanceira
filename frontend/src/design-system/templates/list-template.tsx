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
    <div>
      <PageHeader title={title} description={description} actions={actions} />
      {taskGuide && <div className="mb-4">{taskGuide}</div>}
      {filters}
      {loading && <Skeleton className="mt-4 h-40 w-full" />}
      {error && <ErrorState className="mt-4" message={error} onRetry={onRetry} />}
      {!loading && !error && <div className="mt-4 stack-gap">{children}</div>}
    </div>
  );
}
