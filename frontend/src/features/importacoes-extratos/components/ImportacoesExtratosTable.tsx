import { Link } from "react-router-dom";
import Badge from "@ui/components/ui/badge/Badge";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import type { ImportacaoExtrato } from "../types/importacao-extrato.types";
import {
  bancoLabel,
  conciliadosTotal,
  formatDateTime,
  importacaoExtratoDisplayName,
  linhasImportadas,
  movimentosCaption,
  movimentosLabel,
  novasImportadas,
} from "../utils/importacao-extrato-display.util";

type ImportacoesExtratosTableProps = {
  items: ImportacaoExtrato[];
  loading?: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onDelete: (item: ImportacaoExtrato) => void;
  deletingKey?: string | null;
  onImportClick?: () => void;
};

export function ImportacoesExtratosTable({
  items,
  loading,
  page,
  totalPages,
  totalItems,
  onPageChange,
  onDelete,
  deletingKey,
  onImportClick,
}: ImportacoesExtratosTableProps) {
  const columns: DataTableColumn<ImportacaoExtrato>[] = [
    {
      key: "banco",
      header: "Banco",
      cell: (item) => (
        <Badge color="light" size="sm">
          {bancoLabel(item.banco)}
        </Badge>
      ),
    },
    {
      key: "arquivo",
      header: "Arquivo",
      cell: (item) => (
        <div>
          <Link
            to={`/importacoes-bancarias/historico/${item.banco}/${item._id}`}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            {importacaoExtratoDisplayName(item)}
          </Link>
          {item.formato && <p className="text-xs text-gray-500">Formato: {item.formato}</p>}
        </div>
      ),
    },
    {
      key: "periodo",
      header: "Período",
      cell: (item) => item.periodo || "—",
    },
    {
      key: "linhas",
      header: "Linhas no arquivo",
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
      cell: (item) => linhasImportadas(item),
    },
    {
      key: "novas",
      header: "Novas",
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
      cell: (item) => (
        <span>
          {novasImportadas(item)}
          {(item.stats?.skipped ?? 0) > 0 && (
            <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
              ({item.stats?.skipped} já existiam)
            </span>
          )}
        </span>
      ),
    },
    {
      key: "movimentos",
      header: "Entradas / Saídas",
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
      cell: (item) => (
        <span>
          {movimentosLabel(item)}{" "}
          <span className="text-xs text-gray-500">{movimentosCaption(item)}</span>
        </span>
      ),
    },
    {
      key: "conciliados",
      header: "Conciliados",
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
      cell: (item) => conciliadosTotal(item),
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
      cell: (item) => {
        const key = `${item.banco}:${item._id}`;
        return (
          <div className="flex justify-end gap-2">
            <Link
              to={`/importacoes-bancarias/historico/${item.banco}/${item._id}`}
              className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Ver lançamentos
            </Link>
            <button
              type="button"
              onClick={() => onDelete(item)}
              disabled={deletingKey === key}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
            >
              {deletingKey === key ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      rowKey={(item) => `${item.banco}-${item._id}`}
      loading={loading}
      emptyTitle="Nenhuma importação encontrada"
      emptyDescription="Envie um extrato CSV do Asaas ou Nubank."
      emptyActionLabel="Importar extrato CSV"
      onEmptyAction={onImportClick}
      page={page}
      totalPages={totalPages}
      totalItems={totalItems}
      onPageChange={onPageChange}
    />
  );
}
