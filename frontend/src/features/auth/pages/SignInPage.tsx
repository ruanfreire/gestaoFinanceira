import { Navigate, useLocation, useNavigate } from "react-router-dom";
import PageMeta from "@ui/components/common/PageMeta";
import AuthLayout from "@ui/pages/AuthPages/AuthPageLayout";
import SignInForm from "@ui/components/auth/SignInForm";
import { authService } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";

export default function SignInPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <>
      <PageMeta title="Entrar | Gestão Financeira" description="Acesso ao sistema de Gestão Financeira" />
      <AuthLayout>
        <SignInForm
          initialEmail={authService.getRememberedEmail()}
          onLogin={async (credentials) => {
            await login(credentials);
            navigate(from, { replace: true });
          }}
        />
      </AuthLayout>
    </>
  );
}
