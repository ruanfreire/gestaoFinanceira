import { useSidebar } from "@ui/context/SidebarContext";
import { ThemeToggleButton } from "@ui/components/common/ThemeToggleButton";
import UserMenu from "@/features/auth/components/UserMenu";

export default function AppHeader() {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  return (
    <header className="sticky top-0 z-99999 flex w-full border-gray-200 bg-white lg:border-b dark:border-gray-800 dark:bg-gray-900">
      <div className="flex w-full items-center justify-between px-4 py-3 lg:px-6 lg:py-4">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400 lg:h-11 lg:w-11"
          onClick={handleToggle}
          aria-label="Alternar menu lateral"
          aria-expanded={isMobileOpen}
        >
          <span aria-hidden>{isMobileOpen ? "✕" : "☰"}</span>
        </button>

        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
