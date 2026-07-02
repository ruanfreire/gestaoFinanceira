import api, { getApiErrorMessage } from "@/lib/api-client";
import type {
  BancoSource,
  ConciliacaoCountsResponse,
  ConciliacaoListResponse,
  LancamentoConciliacao,
  LancamentoConciliacaoItem,
  NotaCandidata,
} from "./types";

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
      (a, b) => new Date(b.lancamento.data || 0).getTime() - new Date(a.lancamento.data || 0).getTime(),
    );
  }
  return merged;
}

export function itemKey(item: LancamentoConciliacaoItem): string {
  return `${item.source}-${item.lancamento._id}`;
}

export const recebimentosApi = {
  async listPendentes() {
    const [asaasRes, nubankRes] = await Promise.all([
      api.get<ConciliacaoListResponse>("/extrato-asaas/pendentes"),
      api.get<ConciliacaoListResponse>("/extrato-nubank/pendentes"),
    ]);
    return mergeItems(asaasRes.data.items ?? [], nubankRes.data.items ?? []);
  },

  async listSemMatch() {
    const [asaasRes, nubankRes] = await Promise.all([
      api.get<ConciliacaoListResponse>("/extrato-asaas/sem-match"),
      api.get<ConciliacaoListResponse>("/extrato-nubank/sem-match"),
    ]);
    return mergeItems(asaasRes.data.items ?? [], nubankRes.data.items ?? [], true);
  },

  async listCandidatas(source: BancoSource, lancamentoId: string, search?: string) {
    const res = await api.get<{ candidatas: NotaCandidata[] }>(
      `/extrato-${source}/lancamentos/${lancamentoId}/notas`,
      { params: search ? { q: search } : undefined },
    );
    return res.data.candidatas ?? [];
  },

  async updatePagadorNubank(lancamentoId: string, pagadorNome: string) {
    const res = await api.post<{ lancamento: LancamentoConciliacao; candidatas: NotaCandidata[] }>(
      `/extrato-nubank/lancamentos/${lancamentoId}/pagador`,
      { pagador_nome: pagadorNome.trim() },
    );
    return res.data;
  },

  async vincular(source: BancoSource, lancamentoId: string, notaId: string) {
    await api.post(`/extrato-${source}/vincular`, { lancamento_id: lancamentoId, nota_id: notaId });
  },

  async getCounts() {
    const res = await api.get<ConciliacaoCountsResponse>("/conciliacao/counts");
    return res.data;
  },

  getErrorMessage(error: unknown, fallback: string) {
    return getApiErrorMessage(error, fallback);
  },
};

export function matchExplanation(match?: NotaCandidata["match"]): string {
  if (!match) return "";
  const parts: string[] = [];
  if (match.nameScore) parts.push(`Nome ${Math.round(match.nameScore * 100)}%`);
  if (match.valueMatch) parts.push("Valor exato");
  else if (match.partialMatch) parts.push("Valor parcial");
  if (match.competenciaMatch) parts.push("Competência");
  else if (match.daysDiff != null) parts.push(`Data ${match.daysDiff}d`);
  return parts.join(" · ");
}
