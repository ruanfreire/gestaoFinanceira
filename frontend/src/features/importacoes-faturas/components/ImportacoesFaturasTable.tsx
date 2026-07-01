import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import type { ImportacaoFatura } from "../types/importacao-fatura.types";
import {
  formatDateTime,
  importacaoDisplayName,
} from "../utils/importacao-display.util";
import { ImportacaoFaturaStatusBadge } from "./ImportacaoFaturaStatusBadge";

type ImportacoesFaturasTableProps = {
  items: ImportacaoFatura[];
  loading?: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onDelete: (item: ImportacaoFatura) => void;
  deletingId?: string | null;
  onImportClick?: () => void;
};

export function ImportacoesFaturasTable({
  items,
  loading,
  page,
  totalPages,
  totalItems,
  onPageChange,
  onDelete,
  deletingId,
  onImportClick,
}: ImportacoesFaturasTableProps) {
  const columns: DataTableColumn<ImportacaoFatura>[] = [
    {
      key: "arquivo",
      header: "Arquivo / Rótulo",
      cell: (item) => (
        <div>
          <Link
            to={`/importacoes/historico/${item._id}`}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            {importacaoDisplayName(item)}
          </Link>
          {item.label && item.originalName && item.label !== item.originalName && (
            <p className="mt-0.5 text-xs text-gray-500">{item.originalName}</p>
          )}
          {item.descricao && (
            <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{item.descricao}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => (
        <div>
          <ImportacaoFaturaStatusBadge status={item.status} />
          {item.status === "failed" && item.errorMessage && (
            <p className="mt-1 line-clamp-2 max-w-xs text-xs text-red-600 dark:text-red-400">
              {item.errorMessage}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "total",
      header: "Faturas",
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
      cell: (item) => item.stats?.total_faturas ?? "—",
    },
    {
      key: "imported",
      header: "Novas",
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
      cell: (item) => item.stats?.imported ?? "—",
    },
    {
      key: "updated",
      header: "Atualizadas",
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
      cell: (item) => item.stats?.updated ?? "—",
    },
    {
      key: "created",
      header: "Importado em",
      cell: (item) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-gray-400">
          {formatDateTime(item.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Link
            to={`/importacoes/historico/${item._id}`}
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Ver faturas
          </Link>
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={deletingId === item._id}
            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
          >
            {deletingId === item._id ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      rowKey={(item) => item._id}
      loading={loading}
      emptyTitle="Nenhuma importação encontrada"
      emptyDescription="Envie um arquivo JSON para começar."
      emptyActionLabel="Importar JSON"
      onEmptyAction={onImportClick}
      page={page}
      totalPages={totalPages}
      totalItems={totalItems}
      onPageChange={onPageChange}
    />
  );
}
