import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { formatCompetencia, formatCurrency, formatDate } from "@/utils/nota-format.util";
import type { FaturaPreview } from "../types/importacao-fatura.types";

const columns: DataTableColumn<FaturaPreview>[] = [
  {
    key: "numero",
    header: "NF",
    cell: (row) => <span className="font-medium">{row.numero || "—"}</span>,
  },
  {
    key: "tomador",
    header: "Tomador",
    cell: (row) => row.tomador || "—",
  },
  {
    key: "servico",
    header: "Serviço",
    cell: (row) => row.codigo_servico || "—",
  },
  {
    key: "competencia",
    header: "Competência",
    cell: (row) => formatCompetencia(row.mes_competencia),
  },
  {
    key: "emissao",
    header: "Emissão",
    cell: (row) => formatDate(row.data_emissao),
  },
  {
    key: "valor",
    header: "Valor",
    headerClassName: "text-right",
    cellClassName: "text-right tabular-nums",
    cell: (row) => formatCurrency(row.valor),
  },
];

type JsonImportPreviewTableProps = {
  items: FaturaPreview[];
  total: number;
};

export function JsonImportPreviewTable({ items, total }: JsonImportPreviewTableProps) {
  return (
    <div>
      <DataTable
        columns={columns}
        data={items}
        rowKey={(row, index) => `${row.nota_api_id || row.numero}-${index}`}
        emptyTitle="Nenhuma fatura no arquivo"
        skeletonRows={3}
      />
      {total > items.length && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Mostrando {items.length} de {total} fatura(s) do arquivo.
        </p>
      )}
    </div>
  );
}

export function FaturasImportadasTable({
  items,
  loading,
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  items: FaturaPreview[];
  loading?: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const faturaColumns: DataTableColumn<FaturaPreview>[] = [
    ...columns,
    {
      key: "status",
      header: "Status",
      cell: (row) => row.status_emissao || "—",
    },
  ];

  return (
    <DataTable
      columns={faturaColumns}
      data={items}
      rowKey={(row, index) => `${row.nota_api_id || row.numero}-${index}`}
      loading={loading}
      emptyTitle="Nenhuma fatura encontrada neste arquivo"
      page={page}
      totalPages={totalPages}
      totalItems={totalItems}
      onPageChange={onPageChange}
    />
  );
}
