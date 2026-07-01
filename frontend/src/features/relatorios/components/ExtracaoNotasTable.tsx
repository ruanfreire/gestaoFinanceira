import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { NotaPaymentStatusBadge } from "@/features/notas/components/NotaPaymentStatusBadge";
import {
  formatCompetencia,
  formatCurrency,
  formatDate,
  pagamentosResumo,
} from "@/utils/nota-format.util";
import type { NotaExtracao } from "../types/relatorios.types";

const columns: DataTableColumn<NotaExtracao>[] = [
  {
    key: "numero",
    header: "Número",
    cell: (row) => row.numero || "—",
  },
  {
    key: "tomador",
    header: "Tomador",
    cell: (row) => row.tomador || "—",
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
    cell: (row) => formatCurrency(row.valor),
  },
  {
    key: "pago",
    header: "Pago",
    cell: (row) => formatCurrency(row.valor_pago_efetivo ?? row.valor_pago),
  },
  {
    key: "saldo",
    header: "Saldo",
    cell: (row) => formatCurrency(row.saldo_aberto),
  },
  {
    key: "pagamento",
    header: "Pagamento",
    cell: (row) => (
      <div>
        <NotaPaymentStatusBadge
          status={row.status_pagamento}
          valor={row.valor}
          valorPago={row.valor_pago}
        />
        {row.data_pagamento && (
          <span className="mt-1 block text-xs text-gray-400">{formatDate(row.data_pagamento)}</span>
        )}
      </div>
    ),
  },
  {
    key: "pagamentos",
    header: "Pagamentos",
    cellClassName: "max-w-xs text-xs text-gray-600 dark:text-gray-400",
    cell: (row) => pagamentosResumo(row.pagamentos),
  },
  {
    key: "prefeitura",
    header: "Prefeitura",
    cell: (row) =>
      row.link_prefeitura ? (
        <a
          href={row.link_prefeitura}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-500 hover:underline"
        >
          Ver NF
        </a>
      ) : (
        "—"
      ),
  },
];

type ExtracaoNotasTableProps = {
  items: NotaExtracao[];
  loading?: boolean;
};

export function ExtracaoNotasTable({ items, loading }: ExtracaoNotasTableProps) {
  return (
    <DataTable
      columns={columns}
      data={items}
      rowKey={(row) => row._id}
      loading={loading}
      emptyTitle="Nenhuma nota encontrada"
      emptyDescription="Ajuste os filtros e gere o relatório novamente."
      skeletonRows={8}
    />
  );
}
