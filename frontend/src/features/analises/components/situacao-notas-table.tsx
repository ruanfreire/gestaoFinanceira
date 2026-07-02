import { useMemo, useState } from "react";
import { DataTable } from "@/design-system/organisms";
import type { DataTableColumn } from "@/design-system/organisms";
import { Badge } from "@/design-system/atoms";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import type { NotaExtracao } from "../api";

const columns: DataTableColumn<NotaExtracao>[] = [
  { id: "numero", header: "NF", cell: (n) => n.numero ?? "—", sortable: true, sortValue: (n) => n.numero ?? "" },
  { id: "tomador", header: "Tomador", cell: (n) => n.tomador ?? "—", sortable: true, sortValue: (n) => n.tomador ?? "" },
  {
    id: "valor",
    header: "Valor",
    cell: (n) => formatMoney(n.valor),
    sortable: true,
    sortValue: (n) => n.valor ?? 0,
  },
  {
    id: "pago",
    header: "Pago",
    cell: (n) => formatMoney(n.valor_pago_efetivo ?? n.valor_pago),
    sortable: true,
    sortValue: (n) => n.valor_pago_efetivo ?? n.valor_pago ?? 0,
  },
  {
    id: "saldo",
    header: "Em aberto",
    cell: (n) => formatMoney(n.saldo_aberto),
    sortable: true,
    sortValue: (n) => n.saldo_aberto ?? 0,
  },
  {
    id: "status",
    header: "Status",
    cell: (n) => (
      <Badge variant={n.status_pagamento === "pago" ? "success" : "warning"}>
        {PAYMENT_STATUS_LABELS[n.status_pagamento ?? ""] ?? n.status_pagamento}
      </Badge>
    ),
    sortable: true,
    sortValue: (n) => n.status_pagamento ?? "",
  },
  {
    id: "emissao",
    header: "Emissão",
    cell: (n) => formatDate(n.data_emissao),
    hideOnMobile: true,
    sortable: true,
    sortValue: (n) => n.data_emissao ?? "",
  },
];

const PAGE_SIZE = 25;

export function SituacaoNotasTable({ items }: { items: NotaExtracao[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  return (
    <DataTable
      columns={columns}
      data={pageItems}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      virtualize={items.length >= 50}
      defaultSort={{ columnId: "emissao", direction: "desc" }}
      emptyTitle="Nenhuma nota neste período"
      mobileCard={(n) => (
        <div>
          <div className="font-medium">
            NF {n.numero} · {formatMoney(n.valor)}
          </div>
          <div className="text-caption text-muted-foreground">{n.tomador}</div>
        </div>
      )}
    />
  );
}
