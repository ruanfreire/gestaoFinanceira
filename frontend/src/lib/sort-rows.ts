export type SortDirection = "asc" | "desc";

export function sortRows<T>(
  rows: T[],
  sortValue: ((row: T) => string | number | null | undefined) | undefined,
  direction: SortDirection,
): T[] {
  if (!sortValue) return rows;
  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a);
    const bv = sortValue(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av).localeCompare(String(bv), "pt-BR", { numeric: true, sensitivity: "base" });
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}

export function nextSortDirection(current: SortDirection | null): SortDirection {
  return current === "asc" ? "desc" : "asc";
}
