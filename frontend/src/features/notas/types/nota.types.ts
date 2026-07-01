import type { PagamentoResumo } from "@/utils/nota-format.util";

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
  rps_id?: string;
  link_prefeitura?: string;
  pagamentos?: PagamentoResumo[];
};

export type NotasListParams = {
  page?: number;
  limit?: number;
  q?: string;
};

export type NotasListResponse = {
  items: Nota[];
  total: number;
  page: number;
  limit: number;
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
  source: "asaas" | "nubank";
};
