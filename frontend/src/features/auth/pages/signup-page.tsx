import { Link, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { AuthTemplate } from "@/design-system/templates";
import { Button, Input, Typography } from "@/design-system/atoms";
import { FormGroup, Callout } from "@/design-system/molecules";
import { ErrorState } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { signupSchema, type SignupFormData } from "@/features/auth/schema";
import { authApi } from "@/features/auth/api";
import { useAuth } from "@/features/auth/context";

export default function SignupPage() {
  const { isAuthenticated, user } = useAuth();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusTrap(formRef, !isAuthenticated);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", company: "", cnpj: "", phone: "" },
  });

  if (isAuthenticated) {
    return <Navigate to={user?.roles?.includes("superadmin") ? ROUTES.superadmin : ROUTES.home} replace />;
  }

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await authApi.signup(data);
      if (!res.ok) {
        setError(res.message || "Não foi possível concluir o cadastro");
        return;
      }
      setSuccess(res.message || "Cadastro recebido. Aguarde aprovação do administrador.");
    } catch (err) {
      setError(err instanceof Error ? err.message : authApi.getLoginErrorMessage(err));
    }
  };

  return (
    <AuthTemplate title="Criar conta" description="Preencha seus dados. O acesso será liberado após aprovação.">
      {success && (
        <Callout variant="success" title="Cadastro enviado" className="mb-4">
          <Typography variant="body">{success}</Typography>
          <Button type="button" variant="outline" size="sm" className="mt-3" asChild>
            <Link to={ROUTES.entrar}>Ir para o login</Link>
          </Button>
        </Callout>
      )}
      {error && <ErrorState title="Não foi possível cadastrar" message={error} className="mb-4" />}
      {!success && (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="stack-gap" noValidate>
          <FormGroup label="Nome completo" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" autoComplete="name" {...register("name")} />
          </FormGroup>
          <FormGroup label="E-mail" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
          </FormGroup>
          <FormGroup label="Senha" htmlFor="password" error={errors.password?.message} required>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          </FormGroup>
          <FormGroup label="Empresa" htmlFor="company" error={errors.company?.message} required>
            <Input id="company" autoComplete="organization" {...register("company")} />
          </FormGroup>
          <FormGroup label="CNPJ (opcional)" htmlFor="cnpj" error={errors.cnpj?.message}>
            <Input id="cnpj" {...register("cnpj")} />
          </FormGroup>
          <FormGroup label="Telefone (opcional)" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
          </FormGroup>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Solicitar acesso
          </Button>
          <Typography variant="caption" tone="muted" className="text-center">
            Já tem conta? <Link to={ROUTES.entrar} className="text-primary hover:underline">Entrar</Link>
          </Typography>
        </form>
      )}
    </AuthTemplate>
  );
}
