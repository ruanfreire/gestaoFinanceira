import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "@ui/components/form/input/InputField";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import { PageHeader } from "@/shared/components/PageHeader";
import { FilterBar } from "@/shared/components/FilterBar";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { NOTAS_PAGE_SIZE } from "../services/notas.service";
import { useNotasQuery } from "../hooks/useNotasQuery";
import { NotasTable } from "../components/NotasTable";

export default function NotasListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useNotasQuery(page, searchTerm);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / NOTAS_PAGE_SIZE));
  const notas = data?.items ?? [];

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Notas Fiscais"
        description={`${total} registro(s) · mais recentes primeiro`}
        actions={
          <Link to="/notas/new">
            <Button>Nova Nota</Button>
          </Link>
        }
      />

      <form onSubmit={handleSearch}>
        <FilterBar onRefresh={() => refetch()} loading={isFetching}>
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por tomador, número, ID, status..."
          />
          <div className="flex items-end gap-2">
            <Button type="submit">Buscar</Button>
            {searchTerm && (
              <Button type="button" variant="outline" onClick={clearSearch}>
                Limpar
              </Button>
            )}
          </div>
        </FilterBar>
      </form>

      {searchTerm && (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Resultados para:{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">{searchTerm}</span>
        </p>
      )}

      {isError && (
        <div className="mb-4">
          <Alert
            variant="error"
            title="Erro ao carregar notas"
            message={getApiErrorMessage(error, "Não foi possível listar as notas.")}
          />
        </div>
      )}

      <NotasTable
        notas={notas}
        loading={isLoading}
        expandedId={expandedId}
        onTogglePagamentos={(id) => setExpandedId((current) => (current === id ? null : id))}
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={setPage}
        searchTerm={searchTerm}
        onImportClick={() => navigate("/importacoes")}
      />
    </>
  );
}
