import api from "@/lib/api-client";
import { downloadApiFile } from "@/lib/download";
import { paymentDateApiParams, type PeriodFilterValue } from "@/design-system/molecules";
import { currentMesPagamento } from "@/lib/format";

export type ExtracaoNotasFilters = PeriodFilterValue & {
  statusPagamento?: string;
  dateBasis?: "pagamento" | "emissao" | "competencia";
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

export type FluxoCaixaJobStatus = "queued" | "running" | "succeeded" | "failed" | "expired";

export type FluxoCaixaJob = {
  id: string;
  kind: "fluxo_caixa";
  status: FluxoCaixaJobStatus;
  position?: number;
  progressMessage?: string;
  error?: string;
  filename?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
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

function fluxoCaixaParams(filters: FluxoCaixaFilters): Record<string, string> {
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
  return params;
}

function fluxoFallbackFilename(filters: FluxoCaixaFilters): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const period =
    filters.filterMode === "mes" && filters.mesPagamento
      ? filters.mesPagamento
      : `${filters.from}-a-${filters.to}`;
  return `fluxo-caixa-${filters.banco}-${period}-${stamp}.xlsx`;
}

const JOB_POLL_MS = 2000;
const JOB_TIMEOUT_MS = 10 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  async createFluxoCaixaJob(filters: FluxoCaixaFilters) {
    const res = await api.post<FluxoCaixaJob>("/relatorios/fluxo-caixa/jobs", undefined, {
      params: fluxoCaixaParams(filters),
    });
    return res.data;
  },

  async getFluxoCaixaJob(jobId: string) {
    const res = await api.get<FluxoCaixaJob>(`/relatorios/fluxo-caixa/jobs/${jobId}`);
    return res.data;
  },

  async downloadFluxoCaixaJob(jobId: string, fallbackFilename: string) {
    await downloadApiFile(
      `/relatorios/fluxo-caixa/jobs/${jobId}/download`,
      {},
      fallbackFilename,
    );
  },

  async exportFluxoCaixa(
    filters: FluxoCaixaFilters,
    onProgress?: (job: FluxoCaixaJob) => void,
  ) {
    const fallbackFilename = fluxoFallbackFilename(filters);
    const created = await this.createFluxoCaixaJob(filters);
    onProgress?.(created);

    const startedAt = Date.now();
    let current = created;

    while (current.status === "queued" || current.status === "running") {
      if (Date.now() - startedAt > JOB_TIMEOUT_MS) {
        throw new Error("O relatório demorou demais. Tente novamente em instantes.");
      }
      await sleep(JOB_POLL_MS);
      current = await this.getFluxoCaixaJob(created.id);
      onProgress?.(current);
    }

    if (current.status === "failed") {
      throw new Error(current.error || "Falha ao gerar o relatório.");
    }
    if (current.status === "expired") {
      throw new Error("O arquivo expirou antes do download. Gere o relatório novamente.");
    }
    if (current.status !== "succeeded") {
      throw new Error("Não foi possível concluir o relatório.");
    }

    await this.downloadFluxoCaixaJob(created.id, current.filename || fallbackFilename);
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

export function fluxoJobStatusLabel(job: FluxoCaixaJob | null): string {
  if (!job) return "Preparando relatório...";
  if (job.status === "queued") {
    return job.position && job.position > 1
      ? `Na fila (posição ${job.position})...`
      : "Na fila, aguardando...";
  }
  if (job.status === "running") {
    return job.progressMessage || "Gerando relatório...";
  }
  if (job.status === "succeeded") {
    return "Baixando arquivo...";
  }
  if (job.status === "failed") {
    return job.error || "Falha ao gerar relatório";
  }
  return "Processando...";
}
