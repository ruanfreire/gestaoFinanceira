import { FormEvent, useState } from "react";
import MonthPicker from "@ui/components/form/month-picker";
import DatePicker from "@ui/components/form/date-picker";
import Select from "@ui/components/form/Select";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import ComponentCard from "@ui/components/common/ComponentCard";
import { PageHeader } from "@/shared/components/PageHeader";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { formatCompetencia } from "@/utils/nota-format.util";
import { currentMesPagamento } from "../services/relatorios.service";
import { useExtracaoNotasQuery } from "../hooks/useExtracaoNotasQuery";
import { exportExtracaoNotasCsv } from "../utils/extracao-export.util";
import { ExtracaoNotasMetrics } from "../components/ExtracaoNotasMetrics";
import { ExtracaoNotasTable } from "../components/ExtracaoNotasTable";
import type { ExtracaoNotasFilters, FilterMode } from "../types/relatorios.types";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os pagamentos" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "parcial", label: "Parcial" },
  { value: "pago", label: "Pago" },
];

export default function ExtracaoNotasPage() {
  const [filterMode, setFilterMode] = useState<FilterMode>("mes");
  const [mesPagamento, setMesPagamento] = useState(currentMesPagamento());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusPagamento, setStatusPagamento] = useState("");
  const [submittedFilters, setSubmittedFilters] = useState<ExtracaoNotasFilters | null>(null);

  const { data, isLoading, isFetching, isError, error } = useExtracaoNotasQuery(submittedFilters);

  const handleBuscar = (event: FormEvent) => {
    event.preventDefault();
    setSubmittedFilters({
      filterMode,
      mesPagamento,
      from,
      to,
      statusPagamento,
    });
  };

  return (
    <>
      <PageHeader
        title="Extração de Notas"
        description="Relatório por mês ou intervalo de data de pagamento, com totais e exportação CSV."
      />

      <ComponentCard title="Filtros" desc="Defina o recorte do relatório e clique em gerar.">
        <form onSubmit={handleBuscar} className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="filterMode"
                checked={filterMode === "mes"}
                onChange={() => setFilterMode("mes")}
                className="text-brand-500"
              />
              Por mês de pagamento
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="filterMode"
                checked={filterMode === "periodo"}
                onChange={() => setFilterMode("periodo")}
                className="text-brand-500"
              />
              Por período de pagamento
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filterMode === "mes" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mês de pagamento
                </label>
                <MonthPicker value={mesPagamento} onChange={setMesPagamento} required />
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

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status pagamento
              </label>
              <Select
                options={STATUS_OPTIONS}
                defaultValue={statusPagamento}
                onChange={setStatusPagamento}
                placeholder="Todos"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isLoading || isFetching}>
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
        <div className="mt-4">
          <Alert
            variant="error"
            title="Erro ao carregar relatório"
            message={getApiErrorMessage(error, "Não foi possível carregar o relatório.")}
          />
        </div>
      )}

      {data && (
        <div className="mt-6">
          <ExtracaoNotasMetrics totais={data.totais} />
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
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
