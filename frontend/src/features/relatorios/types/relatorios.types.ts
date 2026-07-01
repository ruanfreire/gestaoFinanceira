import type { PagamentoResumo } from "@/utils/nota-format.util";

export type FilterMode = "mes" | "periodo";

export type NotaExtracao = {
  _id: string;
  numero?: string;
  nota_api_id?: string;
  tomador?: string;
  tomador_documento?: string;
  tomador_email?: string;
  empresa?: string;
  empresa_nome?: string;
  empresa_cnpj?: string;
  codigo_servico?: string;
  discriminacao?: string;
  mes_competencia?: string;
  valor?: number;
  valor_liquido?: number;
  valor_pago?: number;
  valor_pago_efetivo?: number;
  saldo_aberto?: number;
  data_emissao?: string;
  data_pagamento?: string;
  status?: string;
  status_emissao?: string;
  status_pagamento?: string;
  rps_id?: string;
  link_prefeitura?: string;
  prefeitura_ccm?: string;
  prefeitura_cod_nf?: string;
  prefeitura_cod_verificacao?: string;
  qtd_pagamentos?: number;
  pagamentos?: PagamentoResumo[];
};

export type ExtracaoNotasResponse = {
  items: NotaExtracao[];
  total: number;
  totais: {
    valor_nf: number;
    valor_pago: number;
    saldo_aberto: number;
  };
};

export type ExtracaoNotasFilters = {
  filterMode: FilterMode;
  mesPagamento: string;
  from: string;
  to: string;
  statusPagamento: string;
};

export type BancoFluxoCaixa = "nubank" | "asaas" | "consolidado";

export type FluxoCaixaFilters = {
  banco: BancoFluxoCaixa;
  filterMode: FilterMode;
  mesPagamento: string;
  from: string;
  to: string;
  empresaNome: string;
  empresaCnpj: string;
  contaCorrente: string;
  saldoInicial: string;
};
