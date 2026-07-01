import { useMutation, useQueryClient } from "@tanstack/react-query";
import { conciliacaoService } from "../services/conciliacao.service";
import type { BancoSource } from "../types/conciliacao.types";
import { CONCILIACAO_QUERY_KEY } from "./useConciliacaoQuery";

function invalidateConciliacao(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [CONCILIACAO_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["notas"] });
  queryClient.invalidateQueries({ queryKey: ["importacoes-extratos"] });
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
