import api from "@/lib/api-client";
import type { CreateNotaPayload, DesvincularPagamentoPayload, Nota } from "./types";

export const NOTAS_PAGE_SIZE = 50;

export const notasApi = {
  async list(params: { page?: number; limit?: number; q?: string }) {
    const res = await api.get<{ items: Nota[]; total: number; page: number; limit: number }>("/notas", {
      params: { page: params.page ?? 1, limit: params.limit ?? NOTAS_PAGE_SIZE, ...(params.q ? { q: params.q } : {}) },
    });
    return res.data;
  },

  async create(payload: CreateNotaPayload) {
    const res = await api.post<Nota>("/notas", payload);
    return res.data;
  },

  async desvincular(payload: DesvincularPagamentoPayload) {
    await api.post("/notas/desvincular-pagamento", payload);
  },
};
