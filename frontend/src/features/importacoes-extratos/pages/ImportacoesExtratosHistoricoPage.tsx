import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "@ui/components/form/input/InputField";
import Select from "@ui/components/form/Select";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import { PageHeader } from "@/shared/components/PageHeader";
import { FilterBar } from "@/shared/components/FilterBar";
import { useConfirm } from "@/shared/hooks/useConfirm";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import { IMPORTACOES_EXTRATOS_PAGE_SIZE } from "../services/importacoes-extratos.service";
import { useDeleteImportacaoExtratoMutation } from "../hooks/useImportacaoExtratoMutations";
import { useImportacoesExtratosQuery } from "../hooks/useImportacoesExtratosQuery";
import { ImportacoesExtratosTable } from "../components/ImportacoesExtratosTable";
import type { BancoExtrato, ImportacaoExtrato } from "../types/importacao-extrato.types";
import {
  BANCO_FILTER_OPTIONS,
  bancoLabel,
  importacaoExtratoDisplayName,
} from "../utils/importacao-extrato-display.util";

export default function ImportacoesExtratosHistoricoPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const deleteMutation = useDeleteImportacaoExtratoMutation();

  const [banco, setBanco] = useState<BancoExtrato | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useImportacoesExtratosQuery(
    page,
    search,
    banco,
  );

  const total = data?.total ?? 0;
  const limit = data?.limit ?? IMPORTACOES_EXTRATOS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleDelete = async (item: ImportacaoExtrato) => {
    const name = importacaoExtratoDisplayName(item);
    const accepted = await confirm({
      title: "Excluir importação?",
      description: `Excluir importação ${bancoLabel(item.banco)} "${name}"?\n\nLançamentos não conciliados serão removidos. Importações com pagamentos conciliados não podem ser excluídas.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });

    if (!accepted) return;

    const key = `${item.banco}:${item._id}`;
    setDeletingKey(key);
    try {
      await deleteMutation.mutateAsync({ banco: item.banco, id: item._id });
      toast.showToast({ variant: "success", title: "Importação excluída." });
    } catch (err) {
      toast.showToast({
        variant: "error",
        title: getApiErrorMessage(err, "Não foi possível excluir."),
      });
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <>
      {dialog}
      <PageHeader
        title="Histórico de Importações Bancárias"
        description="Consulte extratos já importados e veja todos os lançamentos de cada arquivo."
        actions={
          <Link to="/importacoes-bancarias">
            <Button>Importar CSV</Button>
          </Link>
        }
      />

      <FilterBar onRefresh={() => refetch()} loading={isFetching}>
        <Select
          options={BANCO_FILTER_OPTIONS}
          defaultValue={banco}
          onChange={(value) => {
            setBanco(value as BancoExtrato | "");
            setPage(1);
          }}
          placeholder="Banco"
        />
        <Input
          placeholder="Buscar arquivo, rótulo, período..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </FilterBar>

      {isError && (
        <div className="mb-4">
          <Alert
            variant="error"
            title="Erro ao carregar"
            message={getApiErrorMessage(error, "Não foi possível carregar as importações bancárias.")}
          />
        </div>
      )}

      <ImportacoesExtratosTable
        items={data?.items ?? []}
        loading={isLoading}
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={setPage}
        onDelete={handleDelete}
        deletingKey={deletingKey}
        onImportClick={() => navigate("/importacoes-bancarias")}
      />
    </>
  );
}
