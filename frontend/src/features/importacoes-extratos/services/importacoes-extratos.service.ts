import api, { getApiErrorMessage } from "@/shared/services/api.client";
import { downloadApiFile } from "@/utils/download.util";
import type {
  BancoExtrato,
  ExtratoUploadResult,
  ImportacaoExtrato,
  ImportacoesExtratosListResponse,
  LancamentosExtratoResponse,
  UpdateImportacaoExtratoMetadataPayload,
} from "../types/importacao-extrato.types";

export const IMPORTACOES_EXTRATOS_PAGE_SIZE = 20;
export const LANCAMENTOS_EXTRATO_PAGE_SIZE = 100;

const UPLOAD_ENDPOINTS: Record<BancoExtrato, string> = {
  asaas: "/extrato-asaas/upload",
  nubank: "/extrato-nubank/upload",
};

export const importacoesExtratosService = {
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    banco?: BancoExtrato | "";
  }): Promise<ImportacoesExtratosListResponse> {
    const res = await api.get<ImportacoesExtratosListResponse>("/importacoes-bancarias", {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? IMPORTACOES_EXTRATOS_PAGE_SIZE,
        search: params.search?.trim() || undefined,
        banco: params.banco || undefined,
      },
    });
    return res.data;
  },

  async getById(banco: BancoExtrato, id: string): Promise<ImportacaoExtrato> {
    const res = await api.get<ImportacaoExtrato>(`/importacoes-bancarias/${banco}/${id}`);
    return res.data;
  },

  async listLancamentos(
    banco: BancoExtrato,
    id: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status_conciliacao?: string;
      sort?: "asc" | "desc";
    },
  ): Promise<LancamentosExtratoResponse> {
    const res = await api.get<LancamentosExtratoResponse>(
      `/importacoes-bancarias/${banco}/${id}/lancamentos`,
      {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? LANCAMENTOS_EXTRATO_PAGE_SIZE,
          sort: params.sort ?? "asc",
          search: params.search?.trim() || undefined,
          status_conciliacao: params.status_conciliacao || undefined,
        },
      },
    );
    return res.data;
  },

  async upload(banco: BancoExtrato, file: File): Promise<ExtratoUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<ExtratoUploadResult>(UPLOAD_ENDPOINTS[banco], formData);
    return res.data;
  },

  async updateMetadata(
    banco: BancoExtrato,
    id: string,
    payload: UpdateImportacaoExtratoMetadataPayload,
  ): Promise<ImportacaoExtrato> {
    const res = await api.patch<ImportacaoExtrato>(
      `/importacoes-bancarias/${banco}/${id}`,
      payload,
    );
    return res.data;
  },

  async remove(banco: BancoExtrato, id: string): Promise<void> {
    await api.delete(`/importacoes-bancarias/${banco}/${id}`);
  },

  async downloadCsv(banco: BancoExtrato, id: string, fallbackFilename: string): Promise<void> {
    await downloadApiFile(`/importacoes-bancarias/${banco}/${id}/csv`, {}, fallbackFilename);
  },

  getUploadErrorMessage(error: unknown): string {
    return getApiErrorMessage(error, "Falha ao importar extrato");
  },
};
