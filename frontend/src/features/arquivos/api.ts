import api, { getApiErrorMessage } from "@/lib/api-client";
import { downloadApiFile } from "@/lib/download";
import type { BancoExtrato, ImportacaoExtrato, ImportacaoFatura, ImportacaoUploadResult } from "./types";

export const arquivosApi = {
  async listNotas(params: { page?: number; search?: string }) {
    const res = await api.get<{ items: ImportacaoFatura[]; total: number; page: number; limit: number }>(
      "/importacoes",
      { params: { page: params.page ?? 1, limit: 20, search: params.search?.trim() || undefined } },
    );
    return res.data;
  },

  async listExtratos(params: { page?: number; search?: string; banco?: BancoExtrato | "" }) {
    const res = await api.get<{ items: ImportacaoExtrato[]; total: number }>("/importacoes-bancarias", {
      params: {
        page: params.page ?? 1,
        limit: 20,
        search: params.search?.trim() || undefined,
        banco: params.banco || undefined,
      },
    });
    return res.data;
  },

  async getNota(id: string) {
    const res = await api.get<ImportacaoFatura>(`/importacoes/${id}`);
    return res.data;
  },

  async getExtrato(banco: BancoExtrato, id: string) {
    const res = await api.get<ImportacaoExtrato>(`/importacoes-bancarias/${banco}/${id}`);
    return res.data;
  },

  async listFaturas(id: string, params: { page?: number; search?: string }) {
    const res = await api.get<{ items: unknown[]; total: number; importacao: ImportacaoFatura }>(
      `/importacoes/${id}/faturas`,
      { params: { page: params.page ?? 1, limit: 50, search: params.search?.trim() || undefined } },
    );
    return res.data;
  },

  async listLancamentos(banco: BancoExtrato, id: string, params: { page?: number; status?: string }) {
    const res = await api.get<{ items: unknown[]; total: number; importacao: ImportacaoExtrato }>(
      `/importacoes-bancarias/${banco}/${id}/lancamentos`,
      {
        params: {
          page: params.page ?? 1,
          limit: 100,
          sort: "asc",
          status_conciliacao: params.status || undefined,
        },
      },
    );
    return res.data;
  },

  async uploadNotas(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<ImportacaoUploadResult>("/importacoes/upload", form);
    return res.data;
  },

  async updateNota(id: string, payload: { label?: string; descricao?: string }) {
    const res = await api.patch<ImportacaoFatura>(`/importacoes/${id}`, payload);
    return res.data;
  },

  async updateExtrato(banco: BancoExtrato, id: string, payload: { label?: string; descricao?: string }) {
    const res = await api.patch<ImportacaoExtrato>(`/importacoes-bancarias/${banco}/${id}`, payload);
    return res.data;
  },

  async reprocessNota(id: string) {
    const res = await api.post(`/importacoes/${id}/reprocessar`);
    return res.data;
  },

  async deleteNota(id: string) {
    await api.delete(`/importacoes/${id}`);
  },

  async deleteExtrato(banco: BancoExtrato, id: string) {
    await api.delete(`/importacoes-bancarias/${banco}/${id}`);
  },

  async downloadJson(id: string, filename: string) {
    await downloadApiFile(`/importacoes/${id}/json`, {}, filename);
  },

  async downloadCsv(banco: BancoExtrato, id: string, filename: string) {
    await downloadApiFile(`/importacoes-bancarias/${banco}/${id}/csv`, {}, filename);
  },

  getError(error: unknown, fallback: string) {
    return getApiErrorMessage(error, fallback);
  },
};
