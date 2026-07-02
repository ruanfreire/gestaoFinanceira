import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/query-keys";
import { conciliacaoService } from "../services/conciliacao.service";
import type { BancoSource } from "../types/conciliacao.types";

function invalidateConciliacao(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.conciliacao.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.notas.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.importacoesExtratos.all });
}

export function useVincularConciliacaoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      source,
      lancamentoId,
      notaId,
    }: {
      source: BancoSource;
      lancamentoId: string;
      notaId: string;
    }) => conciliacaoService.vincular(source, lancamentoId, notaId),
    onSuccess: () => invalidateConciliacao(queryClient),
  });
}
