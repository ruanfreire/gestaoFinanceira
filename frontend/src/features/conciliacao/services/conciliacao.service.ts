import api, { getApiErrorMessage } from "@/shared/services/api.client";
import type {
  BancoSource,
  ConciliacaoListResponse,
  LancamentoConciliacao,
  LancamentoConciliacaoItem,
  NotaCandidata,
} from "../types/conciliacao.types";

function mergeItems(
  asaasItems: ConciliacaoListResponse["items"],
  nubankItems: ConciliacaoListResponse["items"],
  sortByDate = false,
): LancamentoConciliacaoItem[] {
  const merged: LancamentoConciliacaoItem[] = [
    ...asaasItems.map((item) => ({ ...item, source: "asaas" as const })),
    ...nubankItems.map((item) => ({ ...item, source: "nubank" as const })),
  ];

  if (sortByDate) {
    merged.sort(
      (a, b) =>
        new Date(b.lancamento.data || 0).getTime() -
        new Date(a.lancamento.data || 0).getTime(),
    );
  }

  return merged;
}

export function itemKey(item: LancamentoConciliacaoItem): string {
  return `${item.source}-${item.lancamento._id}`;
}

export const conciliacaoService = {
  async listPendentes(): Promise<LancamentoConciliacaoItem[]> {
    const [asaasRes, nubankRes] = await Promise.all([
      api.get<ConciliacaoListResponse>("/extrato-asaas/pendentes"),
      api.get<ConciliacaoListResponse>("/extrato-nubank/pendentes"),
    ]);
    return mergeItems(asaasRes.data.items ?? [], nubankRes.data.items ?? []);
  },

  async listSemMatch(): Promise<LancamentoConciliacaoItem[]> {
    const [asaasRes, nubankRes] = await Promise.all([
      api.get<ConciliacaoListResponse>("/extrato-asaas/sem-match"),
      api.get<ConciliacaoListResponse>("/extrato-nubank/sem-match"),
    ]);
    return mergeItems(asaasRes.data.items ?? [], nubankRes.data.items ?? [], true);
  },

  async listNotasCandidatas(
    source: BancoSource,
    lancamentoId: string,
    search?: string,
  ): Promise<NotaCandidata[]> {
    const res = await api.get<{ candidatas: NotaCandidata[] }>(
      `/extrato-${source}/lancamentos/${lancamentoId}/notas`,
      { params: search ? { q: search } : undefined },
    );
    return res.data.candidatas ?? [];
  },

  async updatePagadorNubank(
    lancamentoId: string,
    pagadorNome: string,
  ): Promise<{ lancamento: LancamentoConciliacao; candidatas: NotaCandidata[] }> {
    const res = await api.post<{ lancamento: LancamentoConciliacao; candidatas: NotaCandidata[] }>(
      `/extrato-nubank/lancamentos/${lancamentoId}/pagador`,
      { pagador_nome: pagadorNome.trim() },
    );
    return res.data;
  },

  async vincular(source: BancoSource, lancamentoId: string, notaId: string): Promise<void> {
    await api.post(`/extrato-${source}/vincular`, {
      lancamento_id: lancamentoId,
      nota_id: notaId,
    });
  },

  getErrorMessage(error: unknown, fallback: string): string {
    return getApiErrorMessage(error, fallback);
  },
};
