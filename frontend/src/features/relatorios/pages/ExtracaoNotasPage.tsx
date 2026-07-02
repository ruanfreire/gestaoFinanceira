import { FormEvent, useState } from "react";
import Select from "@ui/components/form/Select";
import FormField from "@ui/components/form/FormField";
import Button from "@ui/components/ui/button/Button";
import ComponentCard from "@ui/components/common/ComponentCard";
import { PageHeader } from "@/shared/components/PageHeader";
import { QueryErrorAlert } from "@/shared/components/QueryErrorAlert";
import {
  PeriodFilterForm,
  validatePeriodFilter,
  type PeriodFilterValues,
} from "@/shared/components/PeriodFilterForm";
import { formatCompetencia } from "@/utils/nota-format.util";
import { currentMesPagamento } from "../services/relatorios.service";
import { useExtracaoNotasQuery } from "../hooks/useExtracaoNotasQuery";
import { exportExtracaoNotasCsv } from "../utils/extracao-export.util";
import { ExtracaoNotasMetrics } from "../components/ExtracaoNotasMetrics";
import { ExtracaoNotasStatusChart } from "../components/ExtracaoNotasStatusChart";
import { ExtracaoNotasTable } from "../components/ExtracaoNotasTable";
import type { ExtracaoNotasFilters } from "../types/relatorios.types";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os pagamentos" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "parcial", label: "Parcial" },
  { value: "pago", label: "Pago" },
];

export default function ExtracaoNotasPage() {
  const [periodValues, setPeriodValues] = useState<PeriodFilterValues>({
    filterMode: "mes",
    mesPagamento: currentMesPagamento(),
    from: "",
    to: "",
  });
  const [statusPagamento, setStatusPagamento] = useState("");
  const [filterError, setFilterError] = useState<string | null>(null);
  const [submittedFilters, setSubmittedFilters] = useState<ExtracaoNotasFilters | null>(null);

  const { data, isLoading, isFetching, isError, error } = useExtracaoNotasQuery(submittedFilters);

  const handleBuscar = (event: FormEvent) => {
    event.preventDefault();
    setFilterError(null);

    const validationError = validatePeriodFilter(periodValues);
    if (validationError) {
      setFilterError(validationError);
      return;
    }

    setSubmittedFilters({
      ...periodValues,
      statusPagamento,
    });
  };

  return (
    <>
      <PageHeader
        title="Extração de Notas"
        description="Relatório por mês ou intervalo de data de pagamento, com totais e exportação CSV."
      />

      <ComponentCard compact title="Filtros" desc="Defina o recorte do relatório e clique em gerar.">
        <form onSubmit={handleBuscar} className="space-y-4">
          <PeriodFilterForm
            values={periodValues}
            onChange={(patch) => setPeriodValues((prev) => ({ ...prev, ...patch }))}
            radioName="extracaoFilterMode"
          >
            <FormField label="Status pagamento">
              <Select
                options={STATUS_OPTIONS}
                defaultValue={statusPagamento}
                onChange={setStatusPagamento}
                placeholder="Todos"
              />
            </FormField>
          </PeriodFilterForm>

          {filterError && (
            <p className="text-sm text-error-600 dark:text-error-400" role="alert">
              {filterError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isLoading || isFetching} loading={isLoading || isFetching}>
              {isLoading || isFetching ? "Carregando..." : "Gerar relatório"}
            </Button>
            {data && data.items.length > 0 && submittedFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={() => exportExtracaoNotasCsv(data.items, submittedFilters)}
              >
                Exportar CSV
              </Button>
            )}
          </div>
        </form>
      </ComponentCard>

      {isError && (
        <QueryErrorAlert
          className="mt-4"
          error={error}
          title="Erro ao carregar relatório"
          fallbackMessage="Não foi possível carregar o relatório."
        />
      )}

      {data && (
        <div className="mt-6 space-y-6">
          <ExtracaoNotasMetrics totais={data.totais} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard compact title="Distribuição por status" desc="Notas no período selecionado.">
              <ExtracaoNotasStatusChart items={data.items} />
            </ComponentCard>
            <ComponentCard compact title="Resumo" desc="Totais consolidados do relatório.">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Total de notas</dt>
                  <dd className="text-lg font-semibold text-gray-800 dark:text-white/90">{data.total}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Valor NF</dt>
                  <dd className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {data.totais.valor_nf.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </dd>
                </div>
              </dl>
            </ComponentCard>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data.total} nota(s)
            {submittedFilters?.filterMode === "mes" && submittedFilters.mesPagamento
              ? ` · pagamentos em ${formatCompetencia(submittedFilters.mesPagamento)}`
              : ""}
          </p>
          <ExtracaoNotasTable items={data.items} loading={isLoading || isFetching} />
        </div>
      )}
    </>
  );
}
