import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "@ui/context/SidebarContext";
import Badge from "@ui/components/ui/badge/Badge";
import { RenderIcon } from "@ui/components/common/IconRenderer";
import { useConciliacaoCounts } from "@/features/conciliacao/hooks/useConciliacaoQuery";
import { navigationGroups, isNavItemActive } from "@/layouts/navigation";

function navBadgeCount(
  badgeKey: string | undefined,
  counts: { pendentes: number; semMatch: number } | undefined,
): number | null {
  if (!badgeKey || !counts) return null;
  if (badgeKey === "conciliacao-pendentes") return counts.pendentes || null;
  if (badgeKey === "conciliacao-sem-match") return counts.semMatch || null;
  return null;
}

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const showLabel = isExpanded || isHovered || isMobileOpen;
  const { data: counts } = useConciliacaoCounts();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-[calc(100dvh-4rem)] flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0 lg:h-dvh
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {showLabel ? (
            <>
              <img className="dark:hidden" src="/images/logo/logo.svg" alt="Gestão Financeira" width={150} height={40} />
              <img className="hidden dark:block" src="/images/logo/logo-dark.svg" alt="Gestão Financeira" width={150} height={40} />
            </>
          ) : (
            <img src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>

      <nav className="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-6">
        {navigationGroups.map((group) => {
          const collapsed = collapsedGroups[group.label] ?? false;
          const groupBadgeTotal = group.items.reduce((sum, item) => {
            const n = navBadgeCount(item.badgeKey, counts);
            return sum + (n ?? 0);
          }, 0);

          return (
            <div key={group.label}>
              {showLabel ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="mb-2 flex w-full items-center justify-between px-2 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-expanded={!collapsed}
                >
                  <span>{group.label}</span>
                  <span className="flex items-center gap-1">
                    {groupBadgeTotal > 0 && (
                      <Badge color="error" size="sm">
                        {groupBadgeTotal > 99 ? "99+" : groupBadgeTotal}
                      </Badge>
                    )}
                    <span aria-hidden>{collapsed ? "▸" : "▾"}</span>
                  </span>
                </button>
              ) : (
                <h2 className="mb-2 text-center text-xs text-gray-400">•••</h2>
              )}
              {(!collapsed || !showLabel) && (
                <ul className="flex flex-col gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isNavItemActive(location.pathname, item);
                    const badge = navBadgeCount(item.badgeKey, counts);
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={`menu-item group ${active ? "menu-item-active" : "menu-item-inactive"}`}
                          title={!showLabel ? item.name : undefined}
                        >
                          <span
                            className={`menu-item-icon-size ${
                              active ? "menu-item-icon-active" : "menu-item-icon-inactive"
                            }`}
                          >
                            {RenderIcon(<Icon />)}
                          </span>
                          {showLabel && (
                            <>
                              <span className="menu-item-text flex-1">{item.name}</span>
                              {badge != null && badge > 0 && (
                                <Badge color="error" size="sm">
                                  {badge > 99 ? "99+" : badge}
                                </Badge>
                              )}
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
