import { Outlet } from "react-router-dom";
import { SidebarProvider, useSidebar } from "@ui/context/SidebarContext";
import { ErrorBoundary } from "@ui/components/common/ErrorBoundary";
import { ScrollToTop } from "@ui/components/common/ScrollToTop";
import Backdrop from "@ui/layout/Backdrop";
import { RouteBreadcrumb } from "@/shared/components/RouteBreadcrumb";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";

function ShellContent() {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const sidebarOffset =
    isExpanded || isHovered ? "lg:pl-[290px]" : "lg:pl-[90px]";

  return (
    <div className="min-h-screen">
      <ScrollToTop />
      <AppSidebar />
      <Backdrop />
      <div
        className={`min-w-0 transition-all duration-300 ease-in-out ${sidebarOffset} ${
          isMobileOpen ? "pl-0" : ""
        }`}
      >
        <AppHeader />
        <main className="mx-auto max-w-(--breakpoint-2xl) p-4 pb-10 md:p-6 md:pb-12">
          <div className="mb-4 lg:hidden">
            <RouteBreadcrumb />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AppShell() {
  return (
    <SidebarProvider>
      <ErrorBoundary>
        <ShellContent />
      </ErrorBoundary>
    </SidebarProvider>
  );
}
