import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate } from "react-router-dom";
import { WizardTemplate } from "@/design-system/templates";
import { TaskGuide, StepHint, ErrorState } from "@/design-system/molecules";
import { Button, Input, Label, Skeleton, Typography } from "@/design-system/atoms";
import { useToast } from "@/app/toast-provider";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";
import { configuracoesCopy } from "@/shared/copy/pt-BR";
import { getApiErrorMessage } from "@/lib/api-client";
import { useOrgProfile, useUpdateOrgProfile } from "../hooks";

const STEPS = [
  { id: "nome", label: "Empresa" },
  { id: "cnpj", label: "CNPJ" },
  { id: "contato", label: "Contato" },
];

const profileSchema = z.object({
  name: z.string().min(2, "Informe a razão social ou nome da empresa"),
  cnpj: z.string().min(14, "Informe o CNPJ completo"),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ConfiguracoesEmpresaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = isTenantOwner(user);
  const [step, setStep] = useState(0);
  const profileQuery = useOrgProfile(isOwner);
  const updateProfile = useUpdateOrgProfile();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      name: profileQuery.data?.name ?? "",
      cnpj: profileQuery.data?.cnpj ?? "",
      phone: profileQuery.data?.phone ?? "",
    },
  });

  if (!isOwner) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const onSubmit = async (data: ProfileForm) => {
    try {
      await updateProfile.mutateAsync({
        name: data.name.trim(),
        cnpj: data.cnpj.trim(),
        phone: data.phone?.trim() || undefined,
      });
      toast("Dados da empresa salvos", "success");
      setStep(2);
    } catch (err) {
      toast(getApiErrorMessage(err, "Não foi possível salvar"), "error");
    }
  };

  if (profileQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (profileQuery.isError) {
    return <ErrorState message="Não foi possível carregar os dados." onRetry={() => profileQuery.refetch()} />;
  }

  const name = watch("name");
  const cnpj = watch("cnpj");

  return (
    <WizardTemplate
      title={configuracoesCopy.empresa.wizardTitle}
      description={configuracoesCopy.empresa.description}
      steps={STEPS}
      currentStep={step}
      taskGuide={
        <TaskGuide
          goal="Configurar empresa"
          steps={["Nome", "CNPJ", "Contato"]}
          minutes={2}
          currentStep={step}
        />
      }
      stepHint={<StepHint>Passo {step + 1}</StepHint>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 0 && (
          <>
            <Typography variant="subtitle">Como sua empresa aparece nas notas?</Typography>
            <div className="space-y-2">
              <Label htmlFor="name">Razão social ou nome</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <Typography variant="caption" className="text-danger">
                  {errors.name.message}
                </Typography>
              )}
            </div>
            <WizardTemplate.Footer>
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                Voltar
              </Button>
              <Button type="button" disabled={!name || name.length < 2} onClick={() => setStep(1)}>
                Continuar
              </Button>
            </WizardTemplate.Footer>
          </>
        )}

        {step === 1 && (
          <>
            <Typography variant="subtitle">CNPJ da empresa</Typography>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" {...register("cnpj")} placeholder="00.000.000/0000-00" />
              {errors.cnpj && (
                <Typography variant="caption" className="text-danger">
                  {errors.cnpj.message}
                </Typography>
              )}
            </div>
            <WizardTemplate.Footer>
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                Voltar
              </Button>
              <Button type="button" disabled={!cnpj || cnpj.length < 14} onClick={() => setStep(2)}>
                Continuar
              </Button>
            </WizardTemplate.Footer>
          </>
        )}

        {step === 2 && (
          <>
            <Typography variant="subtitle">Telefone de contato (opcional)</Typography>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...register("phone")} placeholder="(11) 99999-9999" />
            </div>
            <Typography variant="caption" tone="muted">
              {name} · {cnpj}
            </Typography>
            <WizardTemplate.Footer>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button type="submit" loading={updateProfile.isPending}>
                Salvar e concluir
              </Button>
            </WizardTemplate.Footer>
          </>
        )}
      </form>
    </WizardTemplate>
  );
}
