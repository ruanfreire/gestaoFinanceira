import { useLocation, Navigate, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AppBootLoader } from "@/app/app-boot-loader";
import { useAuth } from "@/features/auth/context";
import { authApi } from "@/features/auth/api";
import { resolveAuthHomePath } from "@/features/auth/resolve-auth-home";
import { useAuthWelcome } from "@/features/auth/hooks/use-auth-welcome";
import { loginSchema, type LoginFormData } from "@/features/auth/schema";
import { AuthTemplate } from "@/design-system/templates";
import { Button, Input, Checkbox, Typography } from "@/design-system/atoms";
import { FormGroup, Callout } from "@/design-system/molecules";
import { ErrorState } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { useFocusTrap } from "@/hooks/use-focus-trap";

export default function EntrarPage() {
  const { isAuthenticated, isBootstrapping, login, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const welcome = useAuthWelcome();
  useFocusTrap(formRef, !isAuthenticated && !isBootstrapping && !isRedirecting);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: authApi.getRememberedEmail(),
      password: "",
      remember: Boolean(authApi.getRememberedEmail()),
    },
  });

  useEffect(() => {
    if (isBootstrapping || isRedirecting || !isAuthenticated) return;
    const target = resolveAuthHomePath(user, from);
    if (target) return;
    void logout();
  }, [from, isAuthenticated, isBootstrapping, isRedirecting, logout, user]);

  if (isBootstrapping || isRedirecting) {
    return <AppBootLoader />;
  }

  const redirectTarget = resolveAuthHomePath(user, from);
  if (isAuthenticated && redirectTarget) {
    return <Navigate to={redirectTarget} replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      const sessionUser = await login(data);
      welcome.dismiss();
      const target = resolveAuthHomePath(sessionUser, from);
      if (!target) {
        await logout();
        setError(
          "Sua conta não está vinculada a uma organização. Peça ao administrador para corrigir o cadastro.",
        );
        return;
      }
      setIsRedirecting(true);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    }
  };

  return (
    <AuthTemplate title="Entrar" description="Use seu e-mail e senha para acessar o sistema">
      {welcome.visible && (
        <Callout variant="success" title="Bem-vindo!" className="mb-4">
          <Typography variant="body">
            Esta é sua primeira visita. Use o e-mail e a senha fornecidos pelo administrador para começar.
          </Typography>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={welcome.dismiss}>
            Entendi
          </Button>
        </Callout>
      )}
      {error && <ErrorState title="Não foi possível entrar" message={error} className="mb-4" />}
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="stack-gap" noValidate>
        <FormGroup label="E-mail" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" state={errors.email ? "error" : "default"} {...register("email")} />
        </FormGroup>
        <FormGroup label="Senha" htmlFor="password" error={errors.password?.message} required>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              state={errors.password ? "error" : "default"}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar caracteres" : "Exibir caracteres"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Typography variant="caption" className="mt-1.5 block text-right">
            <Link to={ROUTES.esqueciSenha} className="text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </Typography>
        </FormGroup>
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={watch("remember")}
            onCheckedChange={(c) => setValue("remember", c === true)}
          />
          <label htmlFor="remember">
            <Typography variant="small">Lembrar neste dispositivo</Typography>
          </label>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
        <Typography variant="caption" className="text-center">
          Não tem conta? <Link to={ROUTES.signup} className="text-primary hover:underline">Solicitar acesso</Link>
        </Typography>
        <Typography variant="caption" className="text-center">
          Precisa de ajuda? Fale com o administrador do sistema.
        </Typography>
      </form>
    </AuthTemplate>
  );
}
