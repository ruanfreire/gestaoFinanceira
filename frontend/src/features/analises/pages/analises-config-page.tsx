import { Link } from "react-router-dom";
import { useState } from "react";
import { FormTemplate } from "@/design-system/templates";
import { Button, Input, Label, Typography } from "@/design-system/atoms";
import { TaskGuide } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { useToast } from "@/app/toast-provider";
import { useFluxoDefaults } from "../hooks/use-fluxo-defaults";
import { EMPTY_FLUXO_DEFAULTS } from "../constants";
import { screenTasks } from "@/lib/screen-tasks";

export default function AnalisesConfigPage() {
  const { defaults, save, reset } = useFluxoDefaults();
  const [form, setForm] = useState(defaults);
  const { toast } = useToast();
  const task = screenTasks.analisesConfig;

  const onSave = () => {
    save(form);
    toast("Padrões salvos para o próximo export de fluxo de caixa", "success");
  };

  const onReset = () => {
    reset();
    setForm(EMPTY_FLUXO_DEFAULTS);
    toast("Padrões restaurados", "success");
  };

  return (
    <FormTemplate
      title="Configurações de exportação"
      description="Valores padrão do Excel de fluxo de caixa — ficam só neste navegador"
      taskGuide={
        <TaskGuide goal={task.goal} steps={[...task.steps]} minutes={task.minutes} />
      }
    >
      <Typography variant="caption" tone="muted" className="mb-4 block">
        Usados quando você exporta fluxo de caixa por banco (Asaas ou Nubank). Não alteram dados no servidor.
      </Typography>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="empresa">Empresa</Label>
          <Input
            id="empresa"
            className="mt-1.5"
            value={form.empresaNome}
            onChange={(e) => setForm({ ...form, empresaNome: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            className="mt-1.5"
            value={form.empresaCnpj}
            onChange={(e) => setForm({ ...form, empresaCnpj: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="conta">Conta corrente</Label>
          <Input
            id="conta"
            className="mt-1.5"
            value={form.contaCorrente}
            onChange={(e) => setForm({ ...form, contaCorrente: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="saldo">Saldo inicial</Label>
          <Input
            id="saldo"
            className="mt-1.5"
            value={form.saldoInicial}
            onChange={(e) => setForm({ ...form, saldoInicial: e.target.value })}
            placeholder="Ex.: 2152,41"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link to={ROUTES.analisesFluxo}>Ir para fluxo de caixa</Link>
        </Button>
        <Button variant="outline" onClick={onReset}>
          Restaurar vazio
        </Button>
        <Button onClick={onSave}>Salvar padrões</Button>
      </div>
    </FormTemplate>
  );
}
