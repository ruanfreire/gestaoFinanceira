import { buildCsv, downloadCsv } from "@/lib/download";
import { formatDate, formatMoney } from "@/lib/format";
import type { NotaExtracao } from "./api";

export function exportExtracaoCsv(items: NotaExtracao[], filename: string) {
  const rows = [
    [
      "Número", "Tomador", "Empresa", "Valor NF", "Valor pago", "Saldo aberto",
      "Status", "Emissão", "Competência",
    ],
    ...items.map((n) => [
      n.numero ?? "",
      n.tomador ?? "",
      n.empresa ?? "",
      formatMoney(n.valor),
      formatMoney(n.valor_pago_efetivo ?? n.valor_pago),
      formatMoney(n.saldo_aberto),
      n.status_pagamento ?? "",
      formatDate(n.data_emissao),
      n.mes_competencia ?? "",
    ]),
  ];
  downloadCsv(filename, buildCsv(rows));
}
