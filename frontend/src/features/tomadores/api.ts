import api from "@/lib/api-client";
import type {
  CreateTomadorPayload,
  ImportarTomadoresResponse,
  ResolverTomadorResponse,
  Tomador,
  TomadorListResponse,
  UpdateTomadorPayload,
} from "./types";

export const tomadoresApi = {
  async list(params?: { page?: number; limit?: number; q?: string }) {
    const { data } = await api.get<TomadorListResponse>("/tomadores", { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await api.get<Tomador>(`/tomadores/${id}`);
    return data;
  },

  async create(payload: CreateTomadorPayload) {
    const { data } = await api.post<Tomador>("/tomadores", payload);
    return data;
  },

  async update(id: string, payload: UpdateTomadorPayload) {
    const { data } = await api.patch<Tomador>(`/tomadores/${id}`, payload);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete<{ ok: boolean; id: string }>(`/tomadores/${id}`);
    return data;
  },

  async resolver(payload: { pagador_nome: string; valor?: number; data?: string }) {
    const { data } = await api.post<ResolverTomadorResponse>("/tomadores/resolver", payload);
    return data;
  },

  async importarDeNotas() {
    const { data } = await api.post<ImportarTomadoresResponse>("/tomadores/importar-de-notas");
    return data;
  },
};
