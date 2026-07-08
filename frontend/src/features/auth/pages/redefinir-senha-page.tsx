import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { AuthTemplate } from "@/design-system/templates";
import { Button, Input, Typography } from "@/design-system/atoms";
import { FormGroup, Callout } from "@/design-system/molecules";
import { ErrorState } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/features/auth/schema";
import { authApi } from "@/features/auth/api";

export default function RedefinirSenhaPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusTrap(formRef, !loadingPreview && !previewError && !successMessage);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      setPreviewError("Link inválido");
      setLoadingPreview(false);
      return;
    }
    authApi
      .previewPasswordReset(token)
      .then((res) => {
        setAccountEmail(res.email);
      })
      .catch(() => setPreviewError("Este link não está mais disponível. Solicite um novo e-mail de redefinição."))
      .finally(() => setLoadingPreview(false));
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    setSubmitError(null);
    try {
      const result = await authApi.resetPassword({ token, password: data.password });
      if (!result.ok) {
        setSubmitError(result.message ?? "Não foi possível redefinir a senha");
        return;
      }
      setSuccessMessage(result.message ?? "Senha redefinida com sucesso.");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Não foi possível redefinir a senha");
    }
  };

  if (loadingPreview) {
    return (
      <AuthTemplate title="Nova senha" description="Validando link…">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </AuthTemplate>
    );
  }

  if (previewError) {
    return (
      <AuthTemplate title="Link inválido">
        <ErrorState message={previewError} className="mb-4" />
        <Button type="button" className="w-full" asChild>
          <Link to={ROUTES.esqueciSenha}>Solicitar novo link</Link>
        </Button>
      </AuthTemplate>
    );
  }

  if (successMessage) {
    return (
      <AuthTemplate title="Senha atualizada" description={successMessage}>
        <Callout variant="success" title="Tudo certo" className="mb-4">
          <Typography variant="body">Use sua nova senha para entrar no Fecho.</Typography>
        </Callout>
        <Button type="button" className="w-full" onClick={() => navigate(ROUTES.entrar, { replace: true })}>
          Ir para o login
        </Button>
      </AuthTemplate>
    );
  }

  return (
    <AuthTemplate
      title="Criar nova senha"
      description="Escolha uma senha segura para acessar sua conta."
    >
      {accountEmail && (
        <Typography variant="caption" tone="muted" className="mb-4 block">
          Conta: {accountEmail}
        </Typography>
      )}
      {submitError && <ErrorState message={submitError} className="mb-4" />}
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="stack-gap" noValidate>
        <FormGroup label="Nova senha" htmlFor="password" error={errors.password?.message} required>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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
        <FormGroup
          label="Confirmar senha"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
          required
        >
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              state={errors.confirmPassword ? "error" : "default"}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? "Ocultar caracteres" : "Exibir caracteres"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormGroup>
        <Typography variant="caption" tone="muted">
          O link expira em breve. Após redefinir, sessões antigas serão encerradas.
        </Typography>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Salvar nova senha
        </Button>
        <Typography variant="caption" className="text-center">
          <Link to={ROUTES.entrar} className="text-primary hover:underline">
            Voltar ao login
          </Link>
        </Typography>
      </form>
    </AuthTemplate>
  );
}
