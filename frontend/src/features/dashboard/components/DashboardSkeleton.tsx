import Skeleton from "@ui/components/ui/skeleton/Skeleton";
import ComponentCard from "@ui/components/common/ComponentCard";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ComponentCard title="Carregando…">
          <Skeleton className="h-48 w-full" />
        </ComponentCard>
        <div className="xl:col-span-2">
          <ComponentCard title="Carregando…">
            <Skeleton className="h-48 w-full" />
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}
