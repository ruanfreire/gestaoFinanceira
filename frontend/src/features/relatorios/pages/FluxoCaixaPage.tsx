import { FormEvent, useState } from "react";
import Input from "@ui/components/form/input/InputField";
import MonthPicker from "@ui/components/form/month-picker";
import DatePicker from "@ui/components/form/date-picker";
import Select from "@ui/components/form/Select";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import ComponentCard from "@ui/components/common/ComponentCard";
import { PageHeader } from "@/shared/components/PageHeader";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import {
  currentMesPagamento,
  currentMonthDateRange,
} from "../services/relatorios.service";
import { useExportFluxoCaixaMutation } from "../hooks/useFluxoCaixaMutation";
import type { BancoFluxoCaixa, FilterMode } from "../types/relatorios.types";

const BANCO_OPTIONS = [
  { value: "consolidado", label: "Consolidado (todos os bancos)" },
  { value: "nubank", label: "Nubank" },
  { value: "asaas", label: "Asaas" },
];

export default function FluxoCaixaPage() {
  const toast = useToast();
  const exportMutation = useExportFluxoCaixaMutation();

  const [banco, setBanco] = useState<BancoFluxoCaixa>("consolidado");
  const [filterMode, setFilterMode] = useState<FilterMode>("mes");
  const [mesPagamento, setMesPagamento] = useState(currentMesPagamento());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [empresaNome, setEmpresaNome] = useState("");
  const [empresaCnpj, setEmpresaCnpj] = useState("");
  const [contaCorrente, setContaCorrente] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bancoLabel =
    banco === "consolidado" ? "todos os bancos" : banco === "asaas" ? "Asaas" : "Nubank";
  const isConsolidado = banco === "consolidado";

  const handleFilterModeChange = (mode: FilterMode) => {
    setFilterMode(mode);
    if (mode === "periodo" && !from && !to) {
      const range = currentMonthDateRange();
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const handleExport = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (filterMode === "periodo") {
      if (!from || !to) {
        setError("Informe a data inicial e a data final do período.");
        return;
      }
      if (from > to) {
        setError("A data inicial não pode ser posterior à data final.");
        return;
      }
    }

    try {
      await exportMutation.mutateAsync({
        banco,
        filterMode,
        mesPagamento,
        from,
        to,
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

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="filterMode"
                checked={filterMode === "mes"}
                onChange={() => handleFilterModeChange("mes")}
                className="text-brand-500"
              />
              Por mês de pagamento
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="filterMode"
                checked={filterMode === "periodo"}
                onChange={() => handleFilterModeChange("periodo")}
                className="text-brand-500"
              />
              Por período de pagamento
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterMode === "mes" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mês de pagamento
                </label>
                <MonthPicker
                  value={mesPagamento}
                  onChange={setMesPagamento}
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pagamento de
                  </label>
                  <DatePicker value={from} onChange={setFrom} max={to || undefined} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pagamento até
                  </label>
                  <DatePicker value={to} onChange={setTo} min={from || undefined} />
                </div>
              </>
            )}
          </div>

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
