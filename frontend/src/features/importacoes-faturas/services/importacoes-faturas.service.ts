import api, { getApiErrorMessage } from "@/shared/services/api.client";
import { downloadApiFile } from "@/utils/download.util";
import type {
  FaturasListResponse,
  ImportacaoFatura,
  ImportacaoUploadResult,
  ImportacoesFaturasListResponse,
  ReprocessResult,
  UpdateImportacaoMetadataPayload,
} from "../types/importacao-fatura.types";

export const IMPORTACOES_FATURAS_PAGE_SIZE = 20;
export const FATURAS_PAGE_SIZE = 50;

export const importacoesFaturasService = {
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ImportacoesFaturasListResponse> {
    const res = await api.get<ImportacoesFaturasListResponse>("/importacoes", {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? IMPORTACOES_FATURAS_PAGE_SIZE,
        search: params.search?.trim() || undefined,
      },
    });
    return res.data;
  },

  async getById(id: string): Promise<ImportacaoFatura> {
    const res = await api.get<ImportacaoFatura>(`/importacoes/${id}`);
    return res.data;
  },

  async listFaturas(
    id: string,
    params: { page?: number; limit?: number; search?: string },
  ): Promise<FaturasListResponse> {
    const res = await api.get<FaturasListResponse>(`/importacoes/${id}/faturas`, {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? FATURAS_PAGE_SIZE,
        search: params.search?.trim() || undefined,
      },
    });
    return res.data;
  },

  async upload(file: File): Promise<ImportacaoUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<ImportacaoUploadResult>("/importacoes/upload", formData);
    return res.data;
  },

  async updateMetadata(id: string, payload: UpdateImportacaoMetadataPayload): Promise<ImportacaoFatura> {
    const res = await api.patch<ImportacaoFatura>(`/importacoes/${id}`, payload);
    return res.data;
  },

  async reprocess(id: string): Promise<ReprocessResult> {
    const res = await api.post<ReprocessResult>(`/importacoes/${id}/reprocessar`);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/importacoes/${id}`);
  },

  async downloadJson(id: string, fallbackFilename: string): Promise<void> {
    await downloadApiFile(`/importacoes/${id}/json`, {}, fallbackFilename);
  },

  getUploadErrorMessage(error: unknown): string {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      return "Sessão expirada ou sem permissão. Faça login novamente.";
    }
    return getApiErrorMessage(error, "Falha ao importar arquivo");
  },
};
