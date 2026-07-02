import { useRef, Fragment } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/design-system/lib/cn";

const DEFAULT_THRESHOLD = 30;
const DEFAULT_MAX_HEIGHT = "min(70vh, 560px)";

export function VirtualList<T>({
  items,
  getKey,
  renderItem,
  estimateSize = 76,
  overscan = 6,
  virtualizeThreshold = DEFAULT_THRESHOLD,
  className,
  maxHeight = DEFAULT_MAX_HEIGHT,
  role,
  "aria-label": ariaLabel,
}: {
  items: T[];
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  virtualizeThreshold?: number;
  className?: string;
  maxHeight?: string;
  role?: string;
  "aria-label"?: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = items.length >= virtualizeThreshold;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  if (!shouldVirtualize) {
    return (
      <Fragment>
        {items.map((item, index) => (
          <Fragment key={getKey(item, index)}>{renderItem(item, index)}</Fragment>
        ))}
      </Fragment>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ maxHeight }}
      role={role}
      aria-label={ariaLabel}
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={getKey(item, virtualRow.index)}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
