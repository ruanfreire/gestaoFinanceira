import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "@ui/components/form/input/InputField";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import { PageHeader } from "@/shared/components/PageHeader";
import { FilterBar } from "@/shared/components/FilterBar";
import { useConfirm } from "@/shared/hooks/useConfirm";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import { IMPORTACOES_FATURAS_PAGE_SIZE } from "../services/importacoes-faturas.service";
import { useDeleteImportacaoFaturaMutation } from "../hooks/useImportacaoFaturaMutations";
import { useImportacoesFaturasQuery } from "../hooks/useImportacoesFaturasQuery";
import { ImportacoesFaturasTable } from "../components/ImportacoesFaturasTable";
import type { ImportacaoFatura } from "../types/importacao-fatura.types";
import { importacaoDisplayName } from "../utils/importacao-display.util";

export default function ImportacoesFaturasHistoricoPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const deleteMutation = useDeleteImportacaoFaturaMutation();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useImportacoesFaturasQuery(
    page,
    search,
  );

  const total = data?.total ?? 0;
  const limit = data?.limit ?? IMPORTACOES_FATURAS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleDelete = async (item: ImportacaoFatura) => {
    const name = importacaoDisplayName(item);
    const accepted = await confirm({
      title: "Excluir importação?",
      description: `Excluir o registro "${name}"?\n\nAs notas fiscais já importadas permanecem no sistema.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });

    if (!accepted) return;

    setDeletingId(item._id);
    try {
      await deleteMutation.mutateAsync(item._id);
      toast.showToast({ variant: "success", title: "Importação excluída." });
    } catch (err) {
      toast.showToast({
        variant: "error",
        title: getApiErrorMessage(err, "Não foi possível excluir a importação."),
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {dialog}
      <PageHeader
        title="Importações de Faturas"
        description="Gerencie todos os arquivos JSON importados e consulte as faturas de cada lote."
        actions={
          <Link to="/importacoes">
            <Button>Nova importação</Button>
          </Link>
        }
      />

      <FilterBar onRefresh={() => refetch()} loading={isFetching}>
        <Input
          placeholder="Buscar por arquivo, rótulo ou descrição..."
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
            message={getApiErrorMessage(error, "Não foi possível carregar as importações.")}
          />
        </div>
      )}

      <ImportacoesFaturasTable
        items={data?.items ?? []}
        loading={isLoading}
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={setPage}
        onDelete={handleDelete}
        deletingId={deletingId}
        onImportClick={() => navigate("/importacoes")}
      />
    </>
  );
}
