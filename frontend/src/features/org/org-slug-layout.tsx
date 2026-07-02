import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/context";
import { OrgSlugProvider } from "./org-slug-context";
import { homePathForSlug } from "@/lib/org-path";
import { ROUTES } from "@/lib/constants";

export function OrgSlugLayout() {
  const { orgSlug } = useParams();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.entrar} replace />;
  }

  const expectedSlug = user?.organization?.slug;
  if (!expectedSlug) {
    return <Navigate to={ROUTES.home} replace />;
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
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to={ROUTES.entrar} replace />;
  const slug = user?.organization?.slug;
  if (slug) return <Navigate to={homePathForSlug(slug)} replace />;
  return <Navigate to={ROUTES.entrar} replace />;
}
