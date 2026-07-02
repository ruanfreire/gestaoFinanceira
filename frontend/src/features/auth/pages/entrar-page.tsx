import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/features/auth/context";
import { authApi } from "@/features/auth/api";
import { loginSchema, type LoginFormData } from "@/features/auth/schema";
import { AuthTemplate } from "@/design-system/templates";
import { Button, Input, Checkbox, Typography } from "@/design-system/atoms";
import { FormGroup, TaskGuide } from "@/design-system/molecules";
import { ErrorState } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { screenTasks } from "@/lib/screen-tasks";

export default function EntrarPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? ROUTES.home;
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    }
  };

  const task = screenTasks.entrar;

  return (
    <AuthTemplate title="Entrar" description="Use o e-mail cadastrado pelo administrador">
      <TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} className="mb-4" />
      {error && <ErrorState title="Não foi possível entrar" message={error} className="mb-4" />}
      <form onSubmit={handleSubmit(onSubmit)} className="stack-gap" noValidate>
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
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
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
            <Typography variant="small">Lembrar e-mail neste dispositivo</Typography>
          </label>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
        <Typography variant="caption" className="text-center">
          Precisa de ajuda? Fale com o administrador do sistema.
        </Typography>
      </form>
    </AuthTemplate>
  );
}
