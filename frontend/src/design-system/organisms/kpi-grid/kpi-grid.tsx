import { StatisticCard } from "@/design-system/molecules";
import { cn } from "@/design-system/lib/cn";

export function KPIGrid({
  items,
  columns = 3,
  carouselOnMobile = false,
}: {
  items: {
    label: string;
    value: React.ReactNode;
    hint?: string;
    highlight?: boolean;
    trend?: React.ReactNode;
  }[];
  columns?: 2 | 3 | 4 | 6;
  carouselOnMobile?: boolean;
}) {
  const colClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3",
  }[columns];

  if (carouselOnMobile) {
    return (
      <>
        <div className={cn("hidden gap-4 sm:grid", colClass)}>
          {items.map((item) => (
            <StatisticCard key={item.label} {...item} />
          ))}
        </div>
        <div
          className="flex gap-3 overflow-x-auto pb-1 sm:hidden snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label="Indicadores financeiros"
        >
          {items.map((item) => (
            <StatisticCard key={item.label} {...item} className="min-w-[72%] shrink-0 snap-start" />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className={`grid gap-4 ${colClass}`}>
      {items.map((item) => (
        <StatisticCard key={item.label} {...item} />
      ))}
    </div>
  );
}
