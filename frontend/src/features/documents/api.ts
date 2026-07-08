import api, { getApiErrorMessage } from "@/lib/api-client";
import type {
  DocumentDetail,
  DocumentListItem,
  FreteConciliacaoListResponse,
  FreteTitulo,
  FreteTituloCandidata,
  IngestBatchResult,
} from "./types";

export const documentsApi = {
  getError(err: unknown, fallback: string) {
    return getApiErrorMessage(err, fallback);
  },

  async ingest(files: File[]): Promise<IngestBatchResult> {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    const { data } = await api.post<IngestBatchResult>("/documents/ingest", form);
    return data;
  },

  async list(params?: { docType?: string; page?: number; limit?: number }) {
    const { data } = await api.get<{ items: DocumentListItem[]; total: number }>("/documents", {
      params,
    });
    return data;
  },

  async getOne(id: string) {
    const { data } = await api.get<DocumentDetail>(`/documents/${id}`);
    return data;
  },

  async listFreteTitulos(params?: { page?: number; limit?: number; status?: string }) {
    const { data } = await api.get<{ items: FreteTitulo[]; total: number }>("/documents/frete-titulos", {
      params,
    });
    return data;
  },

  async runLinkBatch() {
    const { data } = await api.post<{ autoLinked: number; pending: number; nfeLinks: number }>(
      "/documents/link/run",
    );
    return data;
  },

  async listFretePendentes() {
    const { data } = await api.get<FreteConciliacaoListResponse>("/documents/frete-conciliacao/pendentes");
    return data.items ?? [];
  },

  async listFreteSemMatch() {
    const { data } = await api.get<FreteConciliacaoListResponse>("/documents/frete-conciliacao/sem-match");
    return data.items ?? [];
  },

  async listFreteCandidatas(lancamentoId: string, search?: string) {
    const { data } = await api.get<{ candidatas: FreteTituloCandidata[] }>(
      `/documents/frete-conciliacao/lancamentos/${lancamentoId}/titulos`,
      { params: search ? { q: search } : undefined },
    );
    return data.candidatas ?? [];
  },

  async vincularFrete(lancamentoId: string, freteTituloId: string) {
    await api.post("/documents/frete-conciliacao/vincular", {
      lancamento_id: lancamentoId,
      frete_titulo_id: freteTituloId,
    });
  },

  async getFreteCounts() {
    const { data } = await api.get<{ pendentes: number; aguardando_pagamento: number }>(
      "/documents/frete-conciliacao/counts",
    );
    return data;
  },
};
