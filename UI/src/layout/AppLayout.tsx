import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const sidebarOffset =
    isExpanded || isHovered ? "lg:pl-[290px]" : "lg:pl-[90px]";

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <Backdrop />
      <div
        className={`min-w-0 transition-all duration-300 ease-in-out ${sidebarOffset} ${
          isMobileOpen ? "pl-0" : ""
        }`}
      >
        <AppHeader />
        <div className="min-w-0 p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <ErrorBoundary>
        <LayoutContent />
      </ErrorBoundary>
    </SidebarProvider>
  );
};

export default AppLayout;
