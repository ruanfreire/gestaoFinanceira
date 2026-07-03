import api, { getApiErrorMessage } from "@/lib/api-client";
import type {
  BancoSource,
  ConciliacaoCountsResponse,
  ConciliacaoListResponse,
  LancamentoConciliacao,
  LancamentoConciliacaoItem,
  NotaCandidata,
} from "./types";

function mapItems(items: ConciliacaoListResponse["items"]): LancamentoConciliacaoItem[] {
  return items.map((item) => ({ ...item, source: "bank" as const }));
}

export function itemKey(item: LancamentoConciliacaoItem): string {
  return `${item.source}-${item.lancamento._id}`;
}

export const recebimentosApi = {
  async listPendentes() {
    const res = await api.get<ConciliacaoListResponse>("/import-intelligence/pendentes");
    return mapItems(res.data.items ?? []);
  },

  async listSemMatch() {
    const res = await api.get<ConciliacaoListResponse>("/import-intelligence/sem-match");
    const items = mapItems(res.data.items ?? []);
    items.sort(
      (a, b) => new Date(b.lancamento.data || 0).getTime() - new Date(a.lancamento.data || 0).getTime(),
    );
    return items;
  },

  async listCandidatas(_source: BancoSource, lancamentoId: string, search?: string) {
    const res = await api.get<{ candidatas: NotaCandidata[] }>(
      `/import-intelligence/lancamentos/${lancamentoId}/notas`,
      { params: search ? { q: search } : undefined },
    );
    return res.data.candidatas ?? [];
  },

  async updatePagador(lancamentoId: string, pagadorNome: string) {
    const res = await api.post<{ lancamento: LancamentoConciliacao; candidatas: NotaCandidata[] }>(
      `/import-intelligence/lancamentos/${lancamentoId}/pagador`,
      { pagador_nome: pagadorNome.trim() },
    );
    return res.data;
  },

  async vincular(_source: BancoSource, lancamentoId: string, notaId: string) {
    await api.post("/import-intelligence/vincular", { lancamento_id: lancamentoId, nota_id: notaId });
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
