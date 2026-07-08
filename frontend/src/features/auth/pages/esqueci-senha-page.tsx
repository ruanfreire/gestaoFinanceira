import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { AuthTemplate } from "@/design-system/templates";
import { Button, Input, Typography } from "@/design-system/atoms";
import { FormGroup, Callout } from "@/design-system/molecules";
import { ErrorState } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/features/auth/schema";
import { authApi } from "@/features/auth/api";

export default function EsqueciSenhaPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusTrap(formRef, !success);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: authApi.getRememberedEmail() || "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await authApi.requestPasswordReset(data.email);
      setSuccess(
        res.message ||
          "Se existir uma conta com este e-mail, você receberá instruções para redefinir a senha em instantes.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : authApi.getLoginErrorMessage(err));
    }
  };

  return (
    <AuthTemplate
      title="Esqueci minha senha"
      description="Informe o e-mail da sua conta. Enviaremos um link seguro para criar uma nova senha."
    >
      {success ? (
        <Callout variant="success" title="Verifique seu e-mail" className="mb-4">
          <Typography variant="body">{success}</Typography>
          <Button type="button" variant="outline" size="sm" className="mt-3" asChild>
            <Link to={ROUTES.entrar}>Voltar ao login</Link>
          </Button>
        </Callout>
      ) : (
        <>
          {error && <ErrorState title="Não foi possível enviar" message={error} className="mb-4" />}
          <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="stack-gap" noValidate>
            <FormGroup label="E-mail" htmlFor="email" error={errors.email?.message} required>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
            </FormGroup>
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Enviar link de redefinição
            </Button>
            <Typography variant="caption" className="text-center">
              Lembrou a senha?{" "}
              <Link to={ROUTES.entrar} className="text-primary hover:underline">
                Voltar ao login
              </Link>
            </Typography>
          </form>
        </>
      )}
    </AuthTemplate>
  );
}
