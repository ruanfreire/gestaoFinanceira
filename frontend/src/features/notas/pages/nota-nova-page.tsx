import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateNotaMutation } from "../hooks";
import { notaSchema, type NotaFormData } from "../schema";
import { parseBrCurrency } from "@/lib/format";
import { FormTemplate } from "@/design-system/templates";
import { Button } from "@/design-system/atoms";
import { Input } from "@/design-system/atoms";
import { FormGroup, TaskGuide } from "@/design-system/molecules";
import { ErrorState } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { useToast } from "@/app/toast-provider";
import { screenTasks } from "@/lib/screen-tasks";

export default function NotaNovaPage() {
  const navigate = useNavigate();
  const create = useCreateNotaMutation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NotaFormData>({
    resolver: zodResolver(notaSchema),
    defaultValues: { empresa: "", numero: "", data_emissao: "", valor: "" },
  });

  const onSubmit = async (data: NotaFormData) => {
    try {
      await create.mutateAsync({
        empresa: data.empresa.trim(),
        numero: data.numero.trim(),
        valor: parseBrCurrency(data.valor),
        data_emissao: new Date(data.data_emissao).toISOString(),
        status: "emitida",
      });
      toast("Nota registrada com sucesso", "success");
      navigate(ROUTES.notas);
    } catch {
      toast("Não foi possível registrar a nota", "error");
    }
  };

  const task = screenTasks.notaNova;

  return (
    <FormTemplate
      title="Registrar nota"
      description="Preencha os dados da nota fiscal manualmente"
      taskGuide={
        <TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} currentStep={0} />
      }
      error={create.isError ? <ErrorState message="Não foi possível registrar a nota." /> : undefined}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="stack-gap">
        <FormGroup label="Empresa" htmlFor="empresa" description="Nome ou identificador da empresa emissora" error={errors.empresa?.message} required>
          <Input id="empresa" state={errors.empresa ? "error" : "default"} {...register("empresa")} />
        </FormGroup>
        <FormGroup label="Número da NF" htmlFor="numero" error={errors.numero?.message} required>
          <Input id="numero" state={errors.numero ? "error" : "default"} {...register("numero")} />
        </FormGroup>
        <FormGroup label="Data de emissão" htmlFor="data_emissao" error={errors.data_emissao?.message} required>
          <Input id="data_emissao" type="date" state={errors.data_emissao ? "error" : "default"} {...register("data_emissao")} />
        </FormGroup>
        <FormGroup label="Valor (R$)" htmlFor="valor" error={errors.valor?.message} required>
          <Input id="valor" placeholder="1.234,56" state={errors.valor ? "error" : "default"} {...register("valor")} />
        </FormGroup>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" loading={isSubmitting || create.isPending}>
            Registrar nota
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(ROUTES.notas)}>
            Cancelar
          </Button>
        </div>
      </form>
    </FormTemplate>
  );
}
