import { Skeleton } from "@/design-system/atoms";

export function DashboardSkeleton() {
  return (
    <div className="stack-gap section-gap" aria-busy="true" aria-label="Carregando dashboard">
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-48 lg:col-span-8" />
        <Skeleton className="h-48 lg:col-span-4" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-64 lg:col-span-8" />
        <Skeleton className="h-64 lg:col-span-4" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-72 lg:col-span-7" />
        <Skeleton className="h-72 lg:col-span-5" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
