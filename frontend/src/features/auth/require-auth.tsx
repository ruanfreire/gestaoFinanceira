import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context";
import { ROUTES } from "@/lib/constants";
import { isSuperadmin } from "./types";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.entrar} state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export function RequireSuperadmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.entrar} state={{ from: location.pathname }} replace />;
  }
  if (!isSuperadmin(user)) {
    return <Navigate to={ROUTES.home} replace />;
  }
  return <>{children}</>;
}

export function RequireClientApp({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.entrar} state={{ from: location.pathname }} replace />;
  }
  if (isSuperadmin(user)) {
    return <Navigate to={ROUTES.superadmin} replace />;
  }
  return <>{children}</>;
}
