import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "@ui/context/SidebarContext";
import { RenderIcon } from "@ui/components/common/IconRenderer";
import { navigationGroups, isNavItemActive } from "@/layouts/navigation";

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const showLabel = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0
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
              <img
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Gestão Financeira"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Gestão Financeira"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>

      <nav className="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-6">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            {showLabel ? (
              <h2 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                {group.label}
              </h2>
            ) : (
              <h2 className="mb-2 text-center text-xs text-gray-400">•••</h2>
            )}
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(location.pathname, item);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`menu-item group ${
                        active ? "menu-item-active" : "menu-item-inactive"
                      }`}
                      title={!showLabel ? item.name : undefined}
                    >
                      <span
                        className={`menu-item-icon-size ${
                          active ? "menu-item-icon-active" : "menu-item-icon-inactive"
                        }`}
                      >
                        {RenderIcon(<Icon />)}
                      </span>
                      {showLabel && <span className="menu-item-text">{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
