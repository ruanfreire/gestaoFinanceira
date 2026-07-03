import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PageHeader, Callout, ErrorState, PrefetchLink } from "@/design-system/molecules";
import { Button, Input, Label, Skeleton, Typography } from "@/design-system/atoms";
import { Card, CardBody } from "@/design-system/organisms";
import { useToast } from "@/app/toast-provider";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api-client";
import { useOrgProfile, useUpdateOrgProfile } from "../hooks";

const profileSchema = z.object({
  name: z.string().min(2, "Informe a razão social ou nome da empresa"),
  cnpj: z.string().min(14, "Informe o CNPJ completo"),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function PerfilPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = isTenantOwner(user);
  const profileQuery = useOrgProfile(isOwner);
  const updateProfile = useUpdateOrgProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", cnpj: "", phone: "" },
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    reset({
      name: profileQuery.data.name ?? "",
      cnpj: profileQuery.data.cnpj ?? "",
      phone: profileQuery.data.phone ?? "",
    });
  }, [profileQuery.data, reset]);

  if (!isOwner) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const onSubmit = async (data: ProfileForm) => {
    try {
      await updateProfile.mutateAsync({
        name: data.name.trim(),
        cnpj: data.cnpj.trim(),
        phone: data.phone?.trim() ?? "",
      });
      toast("Perfil da organização salvo", "success");
    } catch (error) {
      toast(getApiErrorMessage(error, "Não foi possível salvar o perfil"), "error");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl space-y-6">
      <PrefetchLink
        to={ROUTES.configuracoes}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para configurações
      </PrefetchLink>

      <PageHeader
        title="Perfil da organização"
        description="Razão social, CNPJ e telefone usados em integrações e documentos"
      />

      <Callout variant="info" title="Usado na integração Honest">
        O CNPJ e a razão social cadastrados aqui são comparados com as empresas da sua conta Honest após o login.
        O ID interno da Honest é descoberto automaticamente — não precisa ser informado manualmente.
      </Callout>

      {profileQuery.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : profileQuery.isError ? (
        <ErrorState message="Não foi possível carregar o perfil." onRetry={() => profileQuery.refetch()} />
      ) : (
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Razão social / nome da empresa</Label>
                <Input id="org-name" {...register("name")} placeholder="Ex.: ANA LUISA RICCI BARDI CALADO NECA" />
                {errors.name ? (
                  <Typography variant="caption" tone="danger">
                    {errors.name.message}
                  </Typography>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-cnpj">CNPJ</Label>
                <Input id="org-cnpj" {...register("cnpj")} placeholder="00.000.000/0000-00" />
                {errors.cnpj ? (
                  <Typography variant="caption" tone="danger">
                    {errors.cnpj.message}
                  </Typography>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-phone">Telefone (opcional)</Label>
                <Input id="org-phone" {...register("phone")} placeholder="(00) 00000-0000" />
              </div>

              <Button type="submit" loading={isSubmitting || updateProfile.isPending} disabled={!isDirty}>
                Salvar perfil
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
    </motion.div>
  );
}
