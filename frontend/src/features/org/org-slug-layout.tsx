import { Navigate, Outlet, useParams } from "react-router-dom";
import { AppBootLoader } from "@/app/app-boot-loader";
import { useAuth } from "@/features/auth/context";
import { OrgSlugProvider } from "./org-slug-context";
import { homePathForSlug } from "@/lib/org-path";
import { ROUTES } from "@/lib/constants";

export function OrgSlugLayout() {
  const { orgSlug } = useParams();
  const { user, isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <AppBootLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.entrar} replace />;
  }

  const expectedSlug = user?.organization?.slug;
  if (!expectedSlug) {
    return <Navigate to={ROUTES.entrar} replace />;
  }

  if (orgSlug && orgSlug !== expectedSlug) {
    return <Navigate to={homePathForSlug(expectedSlug)} replace />;
  }

  return (
    <OrgSlugProvider slug={expectedSlug}>
      <Outlet />
    </OrgSlugProvider>
  );
}

export function RootRedirect() {
  const { user, isAuthenticated, isBootstrapping } = useAuth();
  if (isBootstrapping) return <AppBootLoader />;
  if (!isAuthenticated) return <Navigate to={ROUTES.entrar} replace />;
  const slug = user?.organization?.slug;
  if (slug) return <Navigate to={homePathForSlug(slug)} replace />;
  return <Navigate to={ROUTES.entrar} replace />;
}
