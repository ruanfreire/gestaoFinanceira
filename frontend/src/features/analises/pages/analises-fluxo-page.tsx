import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Check, ChevronRight, Download, Landmark } from "lucide-react";
import { analisesApi, defaultFluxoFilters } from "../api";
import { loadFluxoDefaults } from "../hooks/use-fluxo-defaults";
import { WizardTemplate } from "@/design-system/templates";
import { CompactPeriodToolbar, validatePeriodFilter } from "@/design-system/molecules";
import { Button, Input, Label, Typography } from "@/design-system/atoms";
import { useToast } from "@/app/toast-provider";
import { bancoLabel } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/design-system/lib/cn";

const STEPS = [
  { id: "period", label: "Período" },
  { id: "banco", label: "Banco" },
  { id: "export", label: "Baixar" },
];

const STEP_DESCRIPTIONS = [
  "Defina o período de pagamento e, se quiser, filtre também pela competência da nota fiscal.",
  "Escolha de qual banco exportar ou use o consolidado.",
  "Confira o resumo e baixe o arquivo Excel.",
];

const BANK_OPTIONS = [
  {
    value: "consolidado" as const,
    label: "Consolidado",
    description: "Nubank + Asaas em um único arquivo",
    icon: Landmark,
  },
  {
    value: "nubank" as const,
    label: "Nubank",
    description: "Somente movimentos do Nubank",
    icon: Building2,
  },
  {
    value: "asaas" as const,
    label: "Asaas",
    description: "Somente movimentos do Asaas",
    icon: Building2,
  },
];

function formatPeriodLabel(filters: ReturnType<typeof defaultFluxoFilters>) {
  if (filters.filterMode === "mes" && filters.mesPagamento) {
    const [year, month] = filters.mesPagamento.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }
  return `${filters.from.split("-").reverse().join("/")} – ${filters.to.split("-").reverse().join("/")}`;
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
      description="Exporte o relatório em Excel em poucos passos"
      steps={STEPS}
      currentStep={step}
      stepDescription={STEP_DESCRIPTIONS[step]}
    >
      {step === 0 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <CompactPeriodToolbar
              value={filters}
              onChange={(v) => setFilters({ ...filters, ...v })}
              idPrefix="fluxo"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div>
              <Label htmlFor="mesCompetenciaNf" className="text-caption text-muted-foreground">
                Competência da NF (opcional)
              </Label>
              <Input
                id="mesCompetenciaNf"
                type="month"
                className="mt-1.5 h-9"
                value={filters.mesCompetenciaNf}
                onChange={(e) => setFilters({ ...filters, mesCompetenciaNf: e.target.value })}
              />
            </div>
            <Typography variant="caption" tone="muted" className="sm:pb-2">
              Filtra notas emitidas neste mês, além do período de pagamento.
            </Typography>
          </div>

          <WizardTemplate.Footer>
            <Button size="sm" className="w-full sm:w-auto" onClick={nextFromPeriod}>
              Continuar
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
          </WizardTemplate.Footer>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="divide-y divide-border rounded-xl border border-border">
            {BANK_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = filters.banco === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilters({ ...filters, banco: opt.value })}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-default first:rounded-t-xl last:rounded-b-xl",
                    "hover:bg-muted/40",
                    selected && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Typography variant="subtitle">{opt.label}</Typography>
                    <Typography variant="caption" tone="muted" className="mt-0.5 block">
                      {opt.description}
                    </Typography>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                </button>
              );
            })}
          </div>

          <WizardTemplate.Footer>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setStep(0)}>
              Voltar
            </Button>
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setStep(2)}>
              Continuar
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
          </WizardTemplate.Footer>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <dl className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-caption text-muted-foreground">Período</dt>
              <dd className="mt-0.5 text-body font-medium capitalize">{periodLabel}</dd>
            </div>
            <div>
              <dt className="text-caption text-muted-foreground">Banco</dt>
              <dd className="mt-0.5 text-body font-medium">{bancoLabel(filters.banco)}</dd>
            </div>
            {filters.mesCompetenciaNf && (
              <div>
                <dt className="text-caption text-muted-foreground">Competência NF</dt>
                <dd className="mt-0.5 text-body font-medium">{filters.mesCompetenciaNf}</dd>
              </div>
            )}
          </dl>

          <Typography variant="caption" tone="muted">
            O arquivo inclui movimentos conciliados do período selecionado.
          </Typography>

          {filters.banco !== "consolidado" && (
            <details className="rounded-xl border border-border px-4 py-3">
              <summary className="cursor-pointer text-small font-medium text-foreground">
                Campos opcionais (empresa, conta, saldo)
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-caption text-muted-foreground">Empresa</Label>
                  <Input
                    className="mt-1.5 h-9"
                    value={filters.empresaNome}
                    onChange={(e) => setFilters({ ...filters, empresaNome: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-caption text-muted-foreground">CNPJ</Label>
                  <Input
                    className="mt-1.5 h-9"
                    value={filters.empresaCnpj}
                    onChange={(e) => setFilters({ ...filters, empresaCnpj: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-caption text-muted-foreground">Conta corrente</Label>
                  <Input
                    className="mt-1.5 h-9"
                    value={filters.contaCorrente}
                    onChange={(e) => setFilters({ ...filters, contaCorrente: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-caption text-muted-foreground">Saldo inicial</Label>
                  <Input
                    className="mt-1.5 h-9"
                    value={filters.saldoInicial}
                    onChange={(e) => setFilters({ ...filters, saldoInicial: e.target.value })}
                  />
                </div>
              </div>
              <Button variant="link" size="sm" className="mt-3 h-auto px-0" asChild>
                <Link to={ROUTES.analisesConfig}>Salvar como padrão para próximas exportações</Link>
              </Button>
            </details>
          )}

          <WizardTemplate.Footer>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button size="sm" className="w-full sm:w-auto" onClick={onExport} loading={exporting}>
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              Baixar Excel
            </Button>
          </WizardTemplate.Footer>
        </div>
      )}
    </WizardTemplate>
  );
}
