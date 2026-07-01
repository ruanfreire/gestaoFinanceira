import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Input from "@ui/components/form/input/InputField";
import Select from "@ui/components/form/Select";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import ComponentCard from "@ui/components/common/ComponentCard";
import Skeleton from "@ui/components/ui/skeleton/Skeleton";
import { PageHeader } from "@/shared/components/PageHeader";
import { FilterBar } from "@/shared/components/FilterBar";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import {
  importacoesExtratosService,
  LANCAMENTOS_EXTRATO_PAGE_SIZE,
} from "../services/importacoes-extratos.service";
import { useUpdateImportacaoExtratoMutation } from "../hooks/useImportacaoExtratoMutations";
import {
  useImportacaoExtratoQuery,
  useLancamentosExtratoQuery,
} from "../hooks/useImportacoesExtratosQuery";
import { ImportacaoExtratoResumo } from "../components/ImportacaoExtratoResumo";
import { ImportacaoExtratoTimeline } from "../components/ImportacaoExtratoTimeline";
import { LancamentosExtratoTable } from "../components/LancamentosExtratoTable";
import type { BancoExtrato } from "../types/importacao-extrato.types";
import {
  bancoLabel,
  importacaoExtratoDisplayName,
  paginationRange,
  STATUS_CONCILIACAO_OPTIONS,
} from "../utils/importacao-extrato-display.util";

export default function ImportacaoExtratoDetalhePage() {
  const { banco: bancoParam = "", id = "" } = useParams<{ banco: BancoExtrato; id: string }>();
  const banco = bancoParam === "nubank" ? "nubank" : bancoParam === "asaas" ? "asaas" : undefined;

  const toast = useToast();
  const [label, setLabel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const importacaoQuery = useImportacaoExtratoQuery(banco, id);
  const lancamentosQuery = useLancamentosExtratoQuery(banco, id, page, search, statusFilter);
  const updateMutation = useUpdateImportacaoExtratoMutation(banco ?? "asaas", id);

  const importacao = importacaoQuery.data ?? lancamentosQuery.data?.importacao;
  const lancamentos = lancamentosQuery.data;

  useEffect(() => {
    if (!importacao) return;
    setLabel(importacao.label || "");
    setDescricao(importacao.descricao || "");
  }, [importacao?._id, importacao?.label, importacao?.descricao]);

  const totalPages = lancamentos
    ? Math.max(1, Math.ceil(lancamentos.total / (lancamentos.limit || LANCAMENTOS_EXTRATO_PAGE_SIZE)))
    : 1;

  const range = lancamentos
    ? paginationRange(lancamentos.page, lancamentos.limit, lancamentos.total)
    : null;

  const display = importacao;
  const totalImportados =
    lancamentos?.linhas_arquivo ??
    display?.stats?.total_linhas ??
    display?.stats?.imported ??
    lancamentos?.total ??
    0;
  const skippedCount = display?.stats?.skipped ?? 0;

  const isLoading = importacaoQuery.isLoading || lancamentosQuery.isLoading;
  const loadError = importacaoQuery.error || lancamentosQuery.error;

  const handleSave = async () => {
    if (!banco || !id) return;
    try {
      await updateMutation.mutateAsync({ label, descricao });
      toast.showToast({ variant: "success", title: "Informações salvas." });
    } catch (err) {
      toast.showToast({
        variant: "error",
        title: getApiErrorMessage(err, "Não foi possível salvar."),
      });
    }
  };

  const handleDownloadCsv = async () => {
    if (!banco || !id || !importacao) return;
    try {
      await importacoesExtratosService.downloadCsv(
        banco,
        id,
        importacao.originalName || importacao.filename || `extrato-${banco}.csv`,
      );
    } catch (err) {
      toast.showToast({
        variant: "error",
        title: getApiErrorMessage(
          err,
          "CSV original indisponível (importações antigas). Faça uma nova importação.",
        ),
      });
    }
  };

  if (!banco) {
    return (
      <Alert variant="error" title="Banco inválido" message="Use asaas ou nubank na URL." />
    );
  }

  if (isLoading && !display) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={display ? importacaoExtratoDisplayName(display) : "Importação"}
        description={`${bancoLabel(banco)} · ${display?.periodo || "sem período"}`}
        actions={
          <Link
            to="/importacoes-bancarias/historico"
            className="text-sm text-brand-600 hover:underline dark:text-brand-400"
          >
            ← Voltar ao histórico
          </Link>
        }
      />

      {loadError && (
        <div className="mb-4">
          <Alert
            variant="error"
            title="Erro ao carregar"
            message={getApiErrorMessage(loadError, "Não foi possível carregar a importação.")}
          />
        </div>
      )}

      {display && (
        <div className="mb-6 grid gap-4 xl:grid-cols-3">
          <ImportacaoExtratoResumo
            importacao={display}
            banco={banco}
            onDownloadCsv={handleDownloadCsv}
          />

          <ComponentCard title="Identificação" desc="Rótulo e descrição do lote.">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rótulo
                </label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição
                </label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </ComponentCard>

          <div className="xl:col-span-3">
            <ImportacaoExtratoTimeline importacao={display} />
          </div>
        </div>
      )}

      {skippedCount > 0 && (
        <div className="mb-4">
          <Alert
            variant="warning"
            title="Linhas já importadas"
            message={`${skippedCount} linha(s) deste arquivo já existiam no sistema. Elas aparecem abaixo junto com as novas — total de ${totalImportados} movimentos lidos do CSV.`}
          />
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Lançamentos importados do arquivo
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {lancamentosQuery.isLoading
            ? "Carregando..."
            : lancamentos
              ? `${totalImportados} linha(s) no arquivo · exibindo ${range?.from ?? 0}–${range?.to ?? 0} de ${lancamentos.total} (ordem cronológica)`
              : ""}
        </p>
      </div>

      <FilterBar onRefresh={() => lancamentosQuery.refetch()} loading={lancamentosQuery.isFetching}>
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          options={STATUS_CONCILIACAO_OPTIONS}
          defaultValue={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          placeholder="Status"
        />
      </FilterBar>

      <LancamentosExtratoTable
        banco={banco}
        items={lancamentos?.items ?? []}
        loading={lancamentosQuery.isLoading}
        page={page}
        totalPages={totalPages}
        totalItems={lancamentos?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );
}
