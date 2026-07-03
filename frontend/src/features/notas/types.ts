import type { PagamentoResumo } from "@/lib/format";

export type Nota = {
  _id: string;
  nota_api_id?: string;
  numero?: string;
  tomador?: string;
  empresa?: string;
  codigo_servico?: string;
  mes_competencia?: string;
  valor?: number;
  valor_pago?: number;
  data_emissao?: string;
  data_pagamento?: string;
  status?: string;
  status_pagamento?: string;
  pagamentos?: PagamentoResumo[];
};

export type CreateNotaPayload = {
  empresa: string;
  numero: string;
  valor: number;
  data_emissao?: string;
  status?: string;
};

export type DesvincularPagamentoPayload = {
  nota_id: string;
  lancamento_id: string;
};
