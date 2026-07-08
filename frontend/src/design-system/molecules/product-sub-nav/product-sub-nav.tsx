import { PrefetchLink } from "@/design-system/molecules/prefetch-link/prefetch-link";
import { cn } from "@/design-system/lib/cn";
import { stripOrgSlug } from "@/lib/org-path";
import { useLocation } from "react-router-dom";

export type ProductSubNavItem = {
  to: string;
  label: string;
  badge?: number;
};

export function ProductSubNav({ items, ariaLabel }: { items: ProductSubNavItem[]; ariaLabel: string }) {
  const { pathname } = useLocation();
  const current = stripOrgSlug(pathname);

  return (
    <nav aria-label={ariaLabel} className="flex gap-1 overflow-x-auto border-b border-border pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const active = current === item.to || current.startsWith(`${item.to}/`);
        return (
          <PrefetchLink
            key={item.to}
            to={item.to}
            className={cn(
              "relative shrink-0 px-4 py-2.5 text-caption font-medium transition-default",
              active
                ? "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
            {item.badge != null && item.badge > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {item.badge}
              </span>
            )}
          </PrefetchLink>
        );
      })}
    </nav>
  );
}
