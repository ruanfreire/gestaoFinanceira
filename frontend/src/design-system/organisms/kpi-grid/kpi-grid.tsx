import { StatisticCard } from "@/design-system/molecules";

export function KPIGrid({
  items,
  columns = 3,
}: {
  items: { label: string; value: React.ReactNode; hint?: string; highlight?: boolean }[];
  columns?: 2 | 3 | 4;
}) {
  const colClass = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <div className={`grid gap-3 ${colClass}`}>
      {items.map((item) => (
        <StatisticCard key={item.label} {...item} />
      ))}
    </div>
  );
}
