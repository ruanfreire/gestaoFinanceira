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

  return (
    <div className="min-h-screen xl:flex">
      <ScrollToTop />
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
          <RouteBreadcrumb />
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
