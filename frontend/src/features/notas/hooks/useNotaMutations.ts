import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/query-keys";
import { notasService } from "../services/notas.service";
import type { CreateNotaPayload, DesvincularPagamentoPayload } from "../types/nota.types";

export function useCreateNotaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateNotaPayload) => notasService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDesvincularPagamentoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DesvincularPagamentoPayload) =>
      notasService.desvincularPagamento(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
