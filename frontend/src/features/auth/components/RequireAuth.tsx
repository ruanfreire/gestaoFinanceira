import { Navigate, useLocation } from "react-router-dom";
import { authService } from "../services/auth.service";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!authService.isAuthenticated()) {
    return <Navigate to="/auth/signin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export default RequireAuth;
