import { useQuery } from "@tanstack/react-query";
import { conciliacaoService } from "../services/conciliacao.service";
import type { ConciliacaoTab } from "../types/conciliacao.types";

export const CONCILIACAO_QUERY_KEY = "conciliacao" as const;

export function useConciliacaoQuery(tab: ConciliacaoTab) {
  return useQuery({
    queryKey: [CONCILIACAO_QUERY_KEY, tab],
    queryFn: () =>
      tab === "sem_match"
        ? conciliacaoService.listSemMatch()
        : conciliacaoService.listPendentes(),
  });
}

export function useConciliacaoCounts() {
  return useQuery({
    queryKey: [CONCILIACAO_QUERY_KEY, "counts"],
    queryFn: async () => {
      const [pendentes, semMatch] = await Promise.all([
        conciliacaoService.listPendentes(),
        conciliacaoService.listSemMatch(),
      ]);
      return { pendentes: pendentes.length, semMatch: semMatch.length };
    },
  });
}
