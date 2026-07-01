import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notasService } from "../services/notas.service";
import type { CreateNotaPayload, DesvincularPagamentoPayload } from "../types/nota.types";
import { NOTAS_QUERY_KEY } from "./useNotasQuery";

export function useCreateNotaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateNotaPayload) => notasService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTAS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDesvincularPagamentoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DesvincularPagamentoPayload) =>
      notasService.desvincularPagamento(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTAS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
