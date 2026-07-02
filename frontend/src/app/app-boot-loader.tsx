import { Skeleton } from "@/design-system/atoms";

export function AppBootLoader() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4"
      aria-busy="true"
      aria-label="Carregando sessão"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}
