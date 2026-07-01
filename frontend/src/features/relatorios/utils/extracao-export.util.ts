import { buildCsv, downloadCsv } from "@/utils/csv.util";
import type { PagamentoResumo } from "@/utils/nota-format.util";
import { paymentLabel } from "@/features/notas/utils/nota-display.util";
import type { ExtracaoNotasFilters, NotaExtracao } from "../types/relatorios.types";
import { buildExtracaoCsvFilename } from "../services/relatorios.service";

function formatDateIso(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatCurrencyPlain(value?: number) {
  if (value == null) return "";
  return Number(value).toFixed(2).replace(".", ",");
}

function pagamentosResumoCsv(pagamentos?: PagamentoResumo[]) {
  if (!pagamentos?.length) return "";
  return pagamentos
    .map((p) => {
      const parts = [
        p.source,
        formatDateIso(p.data),
        p.valor != null ? formatCurrencyPlain(p.valor) : "",
        p.pagador_nome || p.descricao || "",
      ].filter(Boolean);
      return parts.join(" ");
    })
    .join(" | ");
}

export function exportExtracaoNotasCsv(items: NotaExtracao[], filters: ExtracaoNotasFilters) {
  const headers = [
    "Número",
    "ID API",
    "Tomador",
    "Doc. tomador",
    "E-mail tomador",
    "Empresa",
    "CNPJ empresa",
    "Competência",
    "Emissão",
    "Valor NF",
    "Valor líquido",
    "Valor pago",
    "Saldo aberto",
    "Status pagamento",
    "Data último pagamento",
    "Status emissão",
    "Cód. serviço",
    "Discriminação",
    "RPS",
    "CCM",
    "Cód. NF",
    "Cód. verificação",
    "Link prefeitura",
    "Qtd. pagamentos",
    "Pagamentos (resumo)",
  ];

  const rows = items.map((n) => [
    n.numero ?? "",
    n.nota_api_id ?? "",
    n.tomador ?? "",
    n.tomador_documento ?? "",
    n.tomador_email ?? "",
    n.empresa_nome ?? n.empresa ?? "",
    n.empresa_cnpj ?? "",
    n.mes_competencia ?? "",
    formatDateIso(n.data_emissao),
    formatCurrencyPlain(n.valor),
    formatCurrencyPlain(n.valor_liquido),
    formatCurrencyPlain(n.valor_pago_efetivo ?? n.valor_pago),
    formatCurrencyPlain(n.saldo_aberto),
    paymentLabel(n.status_pagamento),
    formatDateIso(n.data_pagamento),
    n.status_emissao ?? n.status ?? "",
    n.codigo_servico ?? "",
    n.discriminacao ?? "",
    n.rps_id ?? "",
    n.prefeitura_ccm ?? "",
    n.prefeitura_cod_nf ?? "",
    n.prefeitura_cod_verificacao ?? "",
    n.link_prefeitura ?? "",
    String(n.qtd_pagamentos ?? n.pagamentos?.length ?? 0),
    pagamentosResumoCsv(n.pagamentos),
  ]);

  downloadCsv(buildExtracaoCsvFilename(filters), buildCsv([headers, ...rows]));
}
