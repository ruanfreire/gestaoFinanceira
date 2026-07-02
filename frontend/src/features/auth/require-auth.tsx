import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context";
import { ROUTES } from "@/lib/constants";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.entrar} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
