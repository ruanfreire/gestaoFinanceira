import api from "@/shared/services/api.client";
import { downloadApiFile } from "@/utils/download.util";
import type {
  ExtracaoNotasFilters,
  ExtracaoNotasResponse,
  FluxoCaixaFilters,
} from "../types/relatorios.types";

type PaymentDateFilterInput = {
  filterMode: "mes" | "periodo";
  mesPagamento: string;
  from: string;
  to: string;
};

export function paymentDateApiParams(filters: PaymentDateFilterInput): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.filterMode === "mes" && filters.mesPagamento) {
    params.mes_pagamento = filters.mesPagamento;
  } else {
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  }
  return params;
}

function extracaoParams(filters: ExtracaoNotasFilters): Record<string, string> {
  return {
    ...paymentDateApiParams(filters),
    ...(filters.statusPagamento ? { status_pagamento: filters.statusPagamento } : {}),
  };
}

function fluxoCaixaParams(filters: FluxoCaixaFilters): Record<string, string> {
  const params: Record<string, string> = {
    banco: filters.banco,
    ...paymentDateApiParams(filters),
  };
  if (filters.banco !== "consolidado") {
    if (filters.empresaNome.trim()) params.empresa_nome = filters.empresaNome.trim();
    if (filters.empresaCnpj.trim()) params.empresa_cnpj = filters.empresaCnpj.trim();
    if (filters.contaCorrente.trim()) params.conta_corrente = filters.contaCorrente.trim();
    if (filters.saldoInicial.trim()) params.saldo_inicial = filters.saldoInicial.trim();
  }
  return params;
}

export const relatoriosService = {
  async getExtracaoNotas(filters: ExtracaoNotasFilters): Promise<ExtracaoNotasResponse> {
    const res = await api.get<ExtracaoNotasResponse>("/notas/extracao", {
      params: extracaoParams(filters),
    });
    return res.data;
  },

  async exportFluxoCaixa(filters: FluxoCaixaFilters): Promise<void> {
    const fallback = buildFluxoCaixaFilename(filters);
    await downloadApiFile(
      "/relatorios/exportacao-fluxo-caixa",
      fluxoCaixaParams(filters),
      fallback,
    );
  },
};

export function currentMesPagamento(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

/** @deprecated use currentMesPagamento */
export const currentMesCompetencia = currentMesPagamento;

export function currentMonthDateRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function buildFluxoCaixaFilename(filters: FluxoCaixaFilters): string {
  const stamp = new Date().toISOString().slice(0, 10);
  if (filters.filterMode === "mes" && filters.mesPagamento) {
    return `fluxo-caixa-${filters.banco}-${filters.mesPagamento}-${stamp}.xlsx`;
  }
  const from = filters.from || "inicio";
  const to = filters.to || "fim";
  return `fluxo-caixa-${filters.banco}-${from}-a-${to}-${stamp}.xlsx`;
}

export function buildExtracaoCsvFilename(filters: ExtracaoNotasFilters): string {
  const stamp = new Date().toISOString().slice(0, 10);
  if (filters.filterMode === "mes" && filters.mesPagamento) {
    return `extracao-notas-pagamento-${filters.mesPagamento}-${stamp}.csv`;
  }
  const from = filters.from || "inicio";
  const to = filters.to || "fim";
  return `extracao-notas-pagamento-${from}-a-${to}-${stamp}.csv`;
}
