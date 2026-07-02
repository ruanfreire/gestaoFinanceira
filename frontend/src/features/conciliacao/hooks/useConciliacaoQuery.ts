import { useQuery } from "@tanstack/react-query";
import { queryKeys, CONCILIACAO_QUERY_KEY } from "@/shared/constants/query-keys";
import { conciliacaoService } from "../services/conciliacao.service";
import type { ConciliacaoTab } from "../types/conciliacao.types";

export { CONCILIACAO_QUERY_KEY };

export function useConciliacaoQuery(tab: ConciliacaoTab) {
  return useQuery({
    queryKey: queryKeys.conciliacao.tab(tab),
    queryFn: () =>
      tab === "sem_match"
        ? conciliacaoService.listSemMatch()
        : conciliacaoService.listPendentes(),
  });
}

export function useConciliacaoCounts() {
  return useQuery({
    queryKey: queryKeys.conciliacao.counts,
    queryFn: async () => {
      const [pendentes, semMatch] = await Promise.all([
        conciliacaoService.listPendentes(),
        conciliacaoService.listSemMatch(),
      ]);
      return { pendentes: pendentes.length, semMatch: semMatch.length };
    },
  });
}
