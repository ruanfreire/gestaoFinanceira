import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { AuthTemplate } from "@/design-system/templates";
import { Button, Input, Typography } from "@/design-system/atoms";
import { FormGroup, ErrorState } from "@/design-system/molecules";
import api, { getApiErrorMessage } from "@/lib/api-client";
import { homePathForSlug } from "@/lib/org-path";
import { ROUTES } from "@/lib/constants";
import { authApi } from "@/features/auth/api";
import { useAuth } from "@/features/auth/context";

const schema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

type InvitePreview = {
  ok: boolean;
  email: string;
  tenantRole: "owner" | "operator";
  organization: { name: string; slug: string; status: string };
};

export default function ConvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) {
      setPreviewError("Convite inválido");
      setLoadingPreview(false);
      return;
    }
    api
      .get<InvitePreview>(`/auth/invite/${token}`)
      .then((res) => setPreview(res.data))
      .catch(() => setPreviewError("Convite inválido ou expirado"))
      .finally(() => setLoadingPreview(false));
  }, [token]);

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setSubmitError(null);
    try {
      const result = await authApi.acceptInvite({ token, ...data });
      if (!result.ok) {
        setSubmitError(result.message ?? "Não foi possível aceitar o convite");
        return;
      }

      if (result.accessToken && result.user) {
        setSession(result.user);
        const slug = result.user.organization?.slug ?? preview?.organization.slug;
        navigate(slug ? homePathForSlug(slug) : ROUTES.home, { replace: true });
        return;
      }

      setSuccessMessage(result.message ?? "Conta criada. Aguarde aprovação para entrar.");
    } catch (error: unknown) {
      setSubmitError(getApiErrorMessage(error, "Não foi possível aceitar o convite"));
    }
  };

  if (loadingPreview) {
    return (
      <AuthTemplate title="Convite" description="Validando convite…">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </AuthTemplate>
    );
  }

  if (previewError || !preview?.ok) {
    return (
      <AuthTemplate title="Convite inválido">
        <ErrorState message={previewError ?? "Este convite não está mais disponível."} />
      </AuthTemplate>
    );
  }

  if (successMessage) {
    return (
      <AuthTemplate title="Conta criada" description={successMessage}>
        <Button type="button" className="w-full" onClick={() => navigate(ROUTES.entrar, { replace: true })}>
          Ir para o login
        </Button>
      </AuthTemplate>
    );
  }

  return (
    <AuthTemplate
      title={`Entrar em ${preview.organization.name}`}
      description={`Você foi convidado como ${preview.tenantRole === "owner" ? "proprietário" : "operador"}`}
    >
      <Typography variant="caption" tone="muted" className="mb-4 block">
        Conta: {preview.email}
      </Typography>
      {submitError && <ErrorState message={submitError} className="mb-4" />}
      <form onSubmit={handleSubmit(onSubmit)} className="stack-gap" noValidate>
        <FormGroup label="Seu nome" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" {...register("name")} />
        </FormGroup>
        <FormGroup label="Senha" htmlFor="password" error={errors.password?.message} required>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        </FormGroup>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Aceitar convite
        </Button>
      </form>
    </AuthTemplate>
  );
}
