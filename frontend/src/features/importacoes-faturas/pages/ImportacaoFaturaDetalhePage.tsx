import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Input from "@ui/components/form/input/InputField";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import ComponentCard from "@ui/components/common/ComponentCard";
import Skeleton from "@ui/components/ui/skeleton/Skeleton";
import { PageHeader } from "@/shared/components/PageHeader";
import { FilterBar } from "@/shared/components/FilterBar";
import { useConfirm } from "@/shared/hooks/useConfirm";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import { FATURAS_PAGE_SIZE, importacoesFaturasService } from "../services/importacoes-faturas.service";
import {
  useReprocessImportacaoFaturaMutation,
  useUpdateImportacaoFaturaMutation,
} from "../hooks/useImportacaoFaturaMutations";
import {
  useImportacaoFaturaQuery,
  useImportacaoFaturasListQuery,
} from "../hooks/useImportacoesFaturasQuery";
import { FaturasImportadasTable } from "../components/FaturasTable";
import { ImportacaoTimeline } from "../components/ImportacaoTimeline";
import {
  formatDateTime,
  importacaoDisplayName,
} from "../utils/importacao-display.util";

export default function ImportacaoFaturaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [label, setLabel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const importacaoQuery = useImportacaoFaturaQuery(id);
  const faturasQuery = useImportacaoFaturasListQuery(id, page, search);

  const updateMutation = useUpdateImportacaoFaturaMutation(id ?? "");
  const reprocessMutation = useReprocessImportacaoFaturaMutation(id ?? "");

  const importacao = importacaoQuery.data ?? faturasQuery.data?.importacao;
  const faturas = faturasQuery.data;

  useEffect(() => {
    if (!importacao) return;
    setLabel(importacao.label || "");
    setDescricao(importacao.descricao || "");
  }, [importacao?._id, importacao?.label, importacao?.descricao]);

  const totalPages = faturas
    ? Math.max(1, Math.ceil(faturas.total / (faturas.limit || FATURAS_PAGE_SIZE)))
    : 1;

  const isLoading = importacaoQuery.isLoading || faturasQuery.isLoading;
  const loadError = importacaoQuery.error || faturasQuery.error;

  const handleSaveMetadata = async () => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({ label, descricao });
      toast.showToast({ variant: "success", title: "Informações salvas." });
    } catch (err) {
      toast.showToast({
        variant: "error",
        title: getApiErrorMessage(err, "Não foi possível salvar as alterações."),
      });
    }
  };

  const handleReprocess = async () => {
    if (!id) return;

    const accepted = await confirm({
      title: "Reprocessar importação?",
      description:
        "As faturas do JSON serão sincronizadas novamente (novas entram, existentes são atualizadas sem alterar pagamentos).",
      confirmLabel: "Reprocessar",
    });

    if (!accepted) return;

    try {
      const res = await reprocessMutation.mutateAsync();
      toast.showToast({
        variant: "success",
        title: `Reprocessamento concluído: ${res.imported ?? 0} nova(s), ${res.updated ?? 0} atualizada(s).`,
      });
    } catch (err) {
      toast.showToast({
        variant: "error",
        title: getApiErrorMessage(err, "Falha ao reprocessar a importação."),
      });
    }
  };

  const handleDownloadJson = async () => {
    if (!id || !importacao) return;
    try {
      await importacoesFaturasService.downloadJson(
        id,
        importacao.originalName || importacao.filename || `importacao-${id}.json`,
      );
    } catch (err) {
      toast.showToast({
        variant: "error",
        title: getApiErrorMessage(err, "Não foi possível baixar o JSON."),
      });
    }
  };

  if (isLoading && !importacao) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      {dialog}
      <PageHeader
        title={importacao ? importacaoDisplayName(importacao) : "Importação"}
        description={
          importacao?.originalName &&
          importacao.label &&
          importacao.label !== importacao.originalName
            ? importacao.originalName
            : "Detalhe do lote importado"
        }
        actions={
          <Link
            to="/importacoes/historico"
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
            message={getApiErrorMessage(loadError, "Não foi possível carregar os dados.")}
          />
        </div>
      )}

      {importacao && (
        <div className="mb-6 grid gap-4 xl:grid-cols-3">
          <ComponentCard
            title="Resumo"
            desc="Estatísticas e ações do lote."
            className="xl:col-span-2"
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium text-gray-800 dark:text-white/90">{importacao.status}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Importado em</dt>
                <dd className="font-medium">{formatDateTime(importacao.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total de faturas no JSON</dt>
                <dd className="font-medium">{importacao.stats?.total_faturas ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Novas / Atualizadas / Ignoradas</dt>
                <dd className="font-medium">
                  {importacao.stats?.imported ?? 0} / {importacao.stats?.updated ?? 0} /{" "}
                  {importacao.stats?.ignored ?? 0}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleReprocess}
                disabled={reprocessMutation.isPending}
              >
                {reprocessMutation.isPending ? "Reprocessando..." : "Reprocessar JSON"}
              </Button>
              <Button variant="outline" onClick={handleDownloadJson}>
                Baixar JSON
              </Button>
              <Link to="/notas">
                <Button variant="outline">Ver notas fiscais</Button>
              </Link>
            </div>
          </ComponentCard>

          <ComponentCard title="Identificação" desc="Rótulo e descrição do lote.">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rótulo
                </label>
                <Input
                  placeholder="Ex.: Exportação jun/2026"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição
                </label>
                <Input
                  placeholder="Observações sobre este lote"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveMetadata} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </ComponentCard>

          <div className="xl:col-span-3">
            <ImportacaoTimeline importacao={importacao} />
          </div>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Faturas do arquivo
          {faturas && (
            <span className="ml-2 text-sm font-normal text-gray-500">({faturas.total})</span>
          )}
        </h2>
      </div>

      <FilterBar onRefresh={() => faturasQuery.refetch()} loading={faturasQuery.isFetching}>
        <Input
          placeholder="Buscar tomador, número, serviço..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </FilterBar>

      <FaturasImportadasTable
        items={faturas?.items ?? []}
        loading={faturasQuery.isLoading}
        page={page}
        totalPages={totalPages}
        totalItems={faturas?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );
}
