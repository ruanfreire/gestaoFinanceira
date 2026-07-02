import { useState } from "react";
import { Link } from "react-router-dom";
import { analisesApi, defaultFluxoFilters } from "../api";
import { loadFluxoDefaults } from "../hooks/use-fluxo-defaults";
import { WizardTemplate } from "@/design-system/templates";
import {
  PeriodFilter,
  validatePeriodFilter,
  TaskGuide,
  StepHint,
  ChoiceCard,
  ChoiceCardGrid,
} from "@/design-system/molecules";
import { Button, Input, Label, Typography } from "@/design-system/atoms";
import { Card, CardBody } from "@/design-system/organisms";
import { useToast } from "@/app/toast-provider";
import { bancoLabel } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import { screenTasks } from "@/lib/screen-tasks";

const STEPS = [
  { id: "period", label: "Período" },
  { id: "banco", label: "Banco" },
  { id: "export", label: "Baixar" },
];

const STEP_HINTS = [
  "O mês atual já vem selecionado. Ajuste se precisar e toque em Continuar.",
  "Escolha o banco ou deixe consolidado para ver tudo junto.",
  "Revise o resumo e toque em Baixar Excel.",
];

function formatPeriodLabel(filters: ReturnType<typeof defaultFluxoFilters>) {
  if (filters.filterMode === "mes" && filters.mesPagamento) {
    return `Mês ${filters.mesPagamento}`;
  }
  return `${filters.from} a ${filters.to}`;
}

export default function AnalisesFluxoPage() {
  const stored = loadFluxoDefaults();
  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState(() => ({
    ...defaultFluxoFilters(),
    ...stored,
  }));
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const task = screenTasks.analisesFluxo;

  const nextFromPeriod = () => {
    const err = validatePeriodFilter(filters);
    if (err) {
      toast(err, "error");
      return;
    }
    setStep(1);
  };

  const onExport = async () => {
    setExporting(true);
    try {
      await analisesApi.exportFluxoCaixa(filters);
      toast("Arquivo salvo na pasta de downloads.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao exportar", "error");
    } finally {
      setExporting(false);
    }
  };

  const periodLabel = formatPeriodLabel(filters);

  return (
    <WizardTemplate
      title="Fluxo de caixa"
      description="Baixe o relatório em Excel em 3 passos"
      steps={STEPS}
      currentStep={step}
      taskGuide={
        <TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} currentStep={step} />
      }
      stepHint={<StepHint>{STEP_HINTS[step]}</StepHint>}
    >
      {step === 0 && (
        <div className="stack-gap">
          <PeriodFilter value={filters} onChange={(v) => setFilters({ ...filters, ...v })} />
          <Button onClick={nextFromPeriod}>Continuar</Button>
        </div>
      )}

      {step === 1 && (
        <div className="stack-gap">
          <Typography variant="small" className="font-medium">
            Banco
          </Typography>
          <ChoiceCardGrid>
            {[
              { value: "consolidado" as const, label: "Consolidado (Nubank + Asaas)" },
              { value: "nubank" as const, label: "Nubank" },
              { value: "asaas" as const, label: "Asaas" },
            ].map((opt) => (
              <ChoiceCard
                key={opt.value}
                title={opt.label}
                selected={filters.banco === opt.value}
                onClick={() => setFilters({ ...filters, banco: opt.value })}
              />
            ))}
          </ChoiceCardGrid>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              Voltar
            </Button>
            <Button onClick={() => setStep(2)}>Continuar</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <Card>
          <CardBody className="stack-gap">
            <Typography variant="subtitle">Resumo antes de baixar</Typography>
            <ul className="space-y-1 text-body">
              <li>
                <strong>Período:</strong> {periodLabel}
              </li>
              <li>
                <strong>Banco:</strong> {bancoLabel(filters.banco)}
              </li>
              {filters.banco !== "consolidado" && filters.empresaNome && (
                <li>
                  <strong>Empresa:</strong> {filters.empresaNome}
                </li>
              )}
              {filters.banco !== "consolidado" && filters.saldoInicial && (
                <li>
                  <strong>Saldo inicial:</strong> {filters.saldoInicial}
                </li>
              )}
            </ul>
            <Typography variant="caption" tone="muted">
              O arquivo incluirá movimentos conciliados do período selecionado.
            </Typography>

            {filters.banco !== "consolidado" && (
              <details className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-small font-medium">
                  Campos opcionais (empresa, conta, saldo)
                </summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Empresa</Label>
                    <Input
                      className="mt-1.5"
                      value={filters.empresaNome}
                      onChange={(e) => setFilters({ ...filters, empresaNome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>CNPJ</Label>
                    <Input
                      className="mt-1.5"
                      value={filters.empresaCnpj}
                      onChange={(e) => setFilters({ ...filters, empresaCnpj: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Conta corrente</Label>
                    <Input
                      className="mt-1.5"
                      value={filters.contaCorrente}
                      onChange={(e) => setFilters({ ...filters, contaCorrente: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Saldo inicial</Label>
                    <Input
                      className="mt-1.5"
                      value={filters.saldoInicial}
                      onChange={(e) => setFilters({ ...filters, saldoInicial: e.target.value })}
                    />
                  </div>
                </div>
                <Button variant="link" size="sm" className="mt-2 px-0" asChild>
                  <Link to={ROUTES.analisesConfig}>Salvar como padrão para próximas exportações</Link>
                </Button>
              </details>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button size="lg" onClick={onExport} loading={exporting}>
                Baixar Excel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </WizardTemplate>
  );
}
