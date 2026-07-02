import { FormEvent, useState } from "react";
import Input from "@ui/components/form/input/InputField";
import Select from "@ui/components/form/Select";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import ComponentCard from "@ui/components/common/ComponentCard";
import { PageHeader } from "@/shared/components/PageHeader";
import {
  PeriodFilterForm,
  validatePeriodFilter,
  type PeriodFilterValues,
} from "@/shared/components/PeriodFilterForm";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import { currentMesPagamento } from "../services/relatorios.service";
import { useExportFluxoCaixaMutation } from "../hooks/useFluxoCaixaMutation";
import type { BancoFluxoCaixa } from "../types/relatorios.types";

const BANCO_OPTIONS = [
  { value: "consolidado", label: "Consolidado (todos os bancos)" },
  { value: "nubank", label: "Nubank" },
  { value: "asaas", label: "Asaas" },
];

export default function FluxoCaixaPage() {
  const toast = useToast();
  const exportMutation = useExportFluxoCaixaMutation();

  const [banco, setBanco] = useState<BancoFluxoCaixa>("consolidado");
  const [periodValues, setPeriodValues] = useState<PeriodFilterValues>({
    filterMode: "mes",
    mesPagamento: currentMesPagamento(),
    from: "",
    to: "",
  });
  const [empresaNome, setEmpresaNome] = useState("");
  const [empresaCnpj, setEmpresaCnpj] = useState("");
  const [contaCorrente, setContaCorrente] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bancoLabel =
    banco === "consolidado" ? "todos os bancos" : banco === "asaas" ? "Asaas" : "Nubank";
  const isConsolidado = banco === "consolidado";

  const handleExport = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationError = validatePeriodFilter(periodValues);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await exportMutation.mutateAsync({
        banco,
        filterMode: periodValues.filterMode,
        mesPagamento: periodValues.mesPagamento,
        from: periodValues.from,
        to: periodValues.to,
        empresaNome,
        empresaCnpj,
        contaCorrente,
        saldoInicial,
      });
      toast.showToast({ variant: "success", title: "Planilha gerada com sucesso." });
    } catch (err) {
      const msg = getApiErrorMessage(err, "Não foi possível gerar a planilha.");
      setError(msg);
      toast.showToast({ variant: "error", title: msg });
    }
  };

  return (
    <>
      <PageHeader
        title="Exportação — Fluxo de Caixa"
        description={
          isConsolidado
            ? "Gera planilha Excel consolidada com abas de fluxo de caixa do Nubank e Asaas, no layout do modelo Ana Luisa."
            : `Gera planilha Excel no layout de controle de fluxo de caixa, com lançamentos conciliados do ${bancoLabel} vinculados às notas fiscais.`
        }
      />

      <ComponentCard compact title="Parâmetros de exportação">
        <form onSubmit={handleExport} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Banco
            </label>
            <Select
              options={BANCO_OPTIONS}
              defaultValue={banco}
              onChange={(value) => setBanco(value as BancoFluxoCaixa)}
            />
          </div>

          <PeriodFilterForm
            values={periodValues}
            onChange={(patch) => setPeriodValues((prev) => ({ ...prev, ...patch }))}
            radioName="fluxoCaixaFilterMode"
            gridClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          />

          <ComponentCard compact title="Resumo da exportação" className="mt-2" desc="Confira os parâmetros antes de gerar a planilha.">
            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <dt className="text-gray-500">Banco</dt>
                <dd className="font-medium capitalize">{bancoLabel}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Período</dt>
                <dd className="font-medium">
                  {periodValues.filterMode === "mes"
                    ? periodValues.mesPagamento
                    : `${periodValues.from} → ${periodValues.to}`}
                </dd>
              </div>
              {empresaNome && (
                <div>
                  <dt className="text-gray-500">Empresa</dt>
                  <dd className="font-medium">{empresaNome}</dd>
                </div>
              )}
            </dl>
          </ComponentCard>

          <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
            <h2 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">
              Cabeçalho da planilha
            </h2>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              {isConsolidado
                ? "No consolidado, cada aba usa os padrões do respectivo banco. O saldo inicial é calculado automaticamente a partir dos extratos importados."
                : "Deixe em branco para usar os padrões do sistema."}
            </p>
            {!isConsolidado && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Empresa
                </label>
                <Input
                  placeholder="Padrão do sistema"
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CNPJ
                </label>
                <Input
                  placeholder="Padrão do sistema"
                  value={empresaCnpj}
                  onChange={(e) => setEmpresaCnpj(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Conta corrente
                </label>
                <Input
                  placeholder="Padrão do sistema"
                  value={contaCorrente}
                  onChange={(e) => setContaCorrente(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Saldo inicial (R$)
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Automático (extrato importado)"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Calculado pelos saldos do extrato Asaas ou pela sequência de importações do Nubank.
                </p>
              </div>
            </div>
            )}
          </div>

          {error && <Alert variant="error" title="Erro" message={error} />}

          <Button type="submit" disabled={exportMutation.isPending}>
            {exportMutation.isPending ? "Gerando…" : "Exportar Excel (.xlsx)"}
          </Button>
        </form>
      </ComponentCard>

      <ComponentCard
        title="O que entra na planilha"
        className="mt-6"
        desc="Resumo do conteúdo exportado."
      >
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>Layout idêntico ao modelo &quot;CONTROLE DE FLUXO DE CAIXA&quot; (Ana Luisa).</li>
          <li>
            {isConsolidado
              ? "Abas Fluxo de caixa_Nubank e Fluxo de caixa_ASAAS preenchidas no mesmo arquivo."
              : `Aba de fluxo de caixa do ${bancoLabel}.`}
          </li>
          <li>
            Por mês ou período de pagamento: lançamentos do extrato cuja data coincide com o pagamento/recebimento no banco.
          </li>
          <li>
            Compras no cartão Nubank vão para a aba Cartão de Crédito, no mesmo recorte de datas de pagamento.
          </li>
          <li>Colunas: Data, Tipo, Categoria/Plano de contas, NF, Cliente, Histórico, Valor e Saldo Banco.</li>
          <li>Aba <strong>Lista</strong> com tipos (Entrada/Saída) e categorias para validação nas células.</li>
          <li>Totais de entradas e saídas (SUMIF) e saldo final do extrato.</li>
        </ul>
      </ComponentCard>
    </>
  );
}
