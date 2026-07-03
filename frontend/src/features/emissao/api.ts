import api from "@/lib/api-client";
import type {
  ConfirmarEmissaoResponse,
  CriarEmissaoRascunhoPayload,
  EmissaoCountsResponse,
  EmissaoRascunho,
  UpdateEmissaoRascunhoPayload,
} from "./types";

export const emissaoApi = {
  async getCounts() {
    const { data } = await api.get<EmissaoCountsResponse>("/emissao/counts");
    return data;
  },

  async criarRascunho(payload: CriarEmissaoRascunhoPayload) {
    const { data } = await api.post<EmissaoRascunho>("/emissao/rascunhos", payload);
    return data;
  },

  async getRascunho(id: string) {
    const { data } = await api.get<EmissaoRascunho>(`/emissao/rascunhos/${id}`);
    return data;
  },

  async atualizarRascunho(id: string, payload: UpdateEmissaoRascunhoPayload) {
    const { data } = await api.patch<EmissaoRascunho>(`/emissao/rascunhos/${id}`, payload);
    return data;
  },

  async confirmar(id: string) {
    const { data } = await api.post<ConfirmarEmissaoResponse>(`/emissao/rascunhos/${id}/confirmar`);
    return data;
  },
};
