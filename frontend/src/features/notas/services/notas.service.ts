import api from "@/shared/services/api.client";
import type {
  CreateNotaPayload,
  DesvincularPagamentoPayload,
  Nota,
  NotasListParams,
  NotasListResponse,
} from "../types/nota.types";

export const NOTAS_PAGE_SIZE = 50;

export const notasService = {
  async list(params: NotasListParams = {}): Promise<NotasListResponse> {
    const { page = 1, limit = NOTAS_PAGE_SIZE, q } = params;
    const res = await api.get<NotasListResponse>("/notas", {
      params: {
        page,
        limit,
        ...(q ? { q } : {}),
      },
    });
    return res.data;
  },

  async create(payload: CreateNotaPayload): Promise<Nota> {
    const res = await api.post<Nota>("/notas", payload);
    return res.data;
  },

  async desvincularPagamento(payload: DesvincularPagamentoPayload): Promise<void> {
    await api.post("/notas/desvincular-pagamento", payload);
  },
};
