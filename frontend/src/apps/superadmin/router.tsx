import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { PageTitleSync } from "@/app/page-title-sync";
import { RequireSuperadmin } from "@/features/auth/require-auth";
import { SuperadminShell } from "@/features/platform/components/superadmin-shell";
import { ROUTES } from "@/lib/constants";
import { lazyRoutes } from "@/lib/lazy-routes";
import { Skeleton } from "@/design-system/atoms";

const EntrarPage = lazy(lazyRoutes.entrar);
const SuperadminDashboardPage = lazy(lazyRoutes.superadminDashboard);
const SuperadminClientsPage = lazy(lazyRoutes.superadminClients);
const SuperadminClientDetailPage = lazy(lazyRoutes.superadminClientDetail);

function PageLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function SuperadminRouter() {
  return (
    <AppProviders>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PageTitleSync />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path={ROUTES.entrar} element={<EntrarPage />} />
            <Route
              path={ROUTES.superadmin}
              element={
                <RequireSuperadmin>
                  <SuperadminShell />
                </RequireSuperadmin>
              }
            >
              <Route index element={<SuperadminDashboardPage />} />
              <Route path="clients" element={<SuperadminClientsPage />} />
              <Route path="clients/:id" element={<SuperadminClientDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to={ROUTES.superadmin} replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </AppProviders>
  );
}
