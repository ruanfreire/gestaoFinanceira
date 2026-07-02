import { useCallback, useState } from "react";
import { useSidebar } from "@ui/context/SidebarContext";
import { CommandPalette } from "@ui/components/ui/command-palette/CommandPalette";
import { ThemeToggleButton } from "@ui/components/common/ThemeToggleButton";
import { useGlobalShortcut } from "@/shared/hooks/useGlobalShortcut";
import { RouteBreadcrumb } from "@/shared/components/RouteBreadcrumb";
import UserMenu from "@/features/auth/components/UserMenu";
import HeaderNotifications from "./HeaderNotifications";
import { useCommandPaletteItems } from "./useCommandPaletteItems";

export default function AppHeader() {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const commandItems = useCommandPaletteItems();

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useGlobalShortcut("k", openPalette, { ctrl: true });

  const handleToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  return (
    <>
      <header className="sticky top-0 z-99999 flex w-full flex-col border-gray-200 bg-white lg:border-b dark:border-gray-800 dark:bg-gray-900">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3 lg:px-6 lg:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400 lg:h-11 lg:w-11"
              onClick={handleToggle}
              aria-label="Alternar menu lateral"
              aria-expanded={isMobileOpen}
            >
              <span aria-hidden>{isMobileOpen ? "✕" : "☰"}</span>
            </button>

            <button
              type="button"
              onClick={openPalette}
              className="hidden min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 sm:flex lg:max-w-md"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="truncate">Buscar...</span>
              <kbd className="ml-auto hidden rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 lg:inline dark:border-gray-700">
                Ctrl K
              </kbd>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openPalette}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 sm:hidden dark:border-gray-800 dark:text-gray-400"
              aria-label="Buscar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <HeaderNotifications />
            <ThemeToggleButton />
            <UserMenu />
          </div>
        </div>

        <div className="hidden border-t border-gray-100 px-6 py-2 dark:border-gray-800 lg:block">
          <RouteBreadcrumb />
        </div>
      </header>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} items={commandItems} />
    </>
  );
}
