import { cn } from "@/design-system/lib/cn";

export function SplitView({
  sidebar,
  main,
  className,
}: {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-[min(70vh,640px)] gap-4 lg:grid-cols-[minmax(260px,320px)_1fr] lg:gap-0 lg:overflow-hidden lg:rounded-xl lg:border lg:border-border",
        className,
      )}
    >
      <aside
        className="lg:overflow-y-auto lg:border-r lg:border-border lg:bg-surface-sunken/50"
        aria-label="Fila de movimentos"
      >
        {sidebar}
      </aside>
      <section className="lg:overflow-y-auto lg:bg-surface" aria-label="Detalhe do movimento">
        {main}
      </section>
    </div>
  );
}
