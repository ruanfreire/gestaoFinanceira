import api from "@/lib/api-client";
import { downloadApiFile } from "@/lib/download";
import { paymentDateApiParams, type PeriodFilterValue } from "@/design-system/molecules";
import { currentMesPagamento } from "@/lib/format";

export type ExtracaoNotasFilters = PeriodFilterValue & {
  statusPagamento?: string;
  dateBasis?: "pagamento" | "emissao";
};

export type FluxoCaixaFilters = PeriodFilterValue & {
  banco: "consolidado" | "custom";
  profileId?: string;
  mesCompetenciaNf: string;
  empresaNome: string;
  empresaCnpj: string;
  contaCorrente: string;
  saldoInicial: string;
};

export type NotaExtracao = {
  _id: string;
  numero?: string;
  tomador?: string;
  empresa?: string;
  valor?: number;
  valor_pago?: number;
  valor_pago_efetivo?: number;
  saldo_aberto?: number;
  status_pagamento?: string;
  data_emissao?: string;
  mes_competencia?: string;
};

export type ExtracaoNotasResponse = {
  items: NotaExtracao[];
  total: number;
  totais: { valor_nf: number; valor_pago: number; saldo_aberto: number };
};

export const analisesApi = {
  async getExtracao(filters: ExtracaoNotasFilters) {
    const res = await api.get<ExtracaoNotasResponse>("/notas/extracao", {
      params: {
        ...paymentDateApiParams(filters),
        ...(filters.statusPagamento ? { status_pagamento: filters.statusPagamento } : {}),
        ...(filters.dateBasis ? { date_basis: filters.dateBasis } : {}),
      },
    });
    return res.data;
  },

  async exportFluxoCaixa(filters: FluxoCaixaFilters) {
    const params: Record<string, string> = {
      banco: filters.banco,
      ...paymentDateApiParams(filters),
    };
    if (filters.banco === "custom" && filters.profileId) {
      params.profile_id = filters.profileId;
    }
    if (filters.banco !== "consolidado" && filters.banco !== "custom") {
      if (filters.empresaNome.trim()) params.empresa_nome = filters.empresaNome.trim();
      if (filters.empresaCnpj.trim()) params.empresa_cnpj = filters.empresaCnpj.trim();
      if (filters.contaCorrente.trim()) params.conta_corrente = filters.contaCorrente.trim();
      if (filters.saldoInicial.trim()) params.saldo_inicial = filters.saldoInicial.trim();
    }
    if (filters.mesCompetenciaNf.trim()) params.mes_competencia_nf = filters.mesCompetenciaNf.trim();
    const stamp = new Date().toISOString().slice(0, 10);
    const period =
      filters.filterMode === "mes" && filters.mesPagamento
        ? filters.mesPagamento
        : `${filters.from}-a-${filters.to}`;
    await downloadApiFile(
      "/relatorios/exportacao-fluxo-caixa",
      params,
      `fluxo-caixa-${filters.banco}-${period}-${stamp}.xlsx`,
    );
  },
};

export function buildExtracaoCsvFilename(filters: ExtracaoNotasFilters): string {
  const stamp = new Date().toISOString().slice(0, 10);
  if (filters.filterMode === "mes" && filters.mesPagamento) {
    return `situacao-notas-${filters.mesPagamento}-${stamp}.csv`;
  }
  return `situacao-notas-${filters.from}-a-${filters.to}-${stamp}.csv`;
}

export function defaultFluxoFilters(): FluxoCaixaFilters {
  return {
    filterMode: "mes",
    mesPagamento: currentMesPagamento(),
    from: "",
    to: "",
    banco: "consolidado",
    mesCompetenciaNf: "",
    empresaNome: "",
    empresaCnpj: "",
    contaCorrente: "",
    saldoInicial: "",
  };
}
