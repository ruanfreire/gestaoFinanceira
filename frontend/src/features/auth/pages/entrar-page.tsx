import { useLocation, Navigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/features/auth/context";
import { authApi } from "@/features/auth/api";
import { useAuthWelcome } from "@/features/auth/hooks/use-auth-welcome";
import { loginSchema, type LoginFormData } from "@/features/auth/schema";
import { AuthTemplate } from "@/design-system/templates";
import { Button, Input, Checkbox, Typography } from "@/design-system/atoms";
import { FormGroup, Callout } from "@/design-system/molecules";
import { ErrorState } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { isSuperadmin } from "@/features/auth/types";
import { homePathForSlug } from "@/lib/org-path";
import { useFocusTrap } from "@/hooks/use-focus-trap";

export default function EntrarPage() {
  const { isAuthenticated, login, user } = useAuth();
  const location = useLocation();
  const defaultFrom =
    user && isSuperadmin(user)
      ? ROUTES.superadmin
      : user?.organization?.slug
        ? homePathForSlug(user.organization.slug)
        : ROUTES.home;
  const from = (location.state as { from?: string } | null)?.from ?? defaultFrom;
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const welcome = useAuthWelcome();
  useFocusTrap(formRef, !isAuthenticated);

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

  if (isAuthenticated) return <Navigate to={from} replace />;

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login(data);
      welcome.dismiss();
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
