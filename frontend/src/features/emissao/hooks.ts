import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emissaoApi } from "./api";
import type { CriarEmissaoRascunhoPayload, UpdateEmissaoRascunhoPayload } from "./types";

export function useEmissaoCounts(enabled = true) {
  return useQuery({
    queryKey: ["emissao", "counts"],
    queryFn: () => emissaoApi.getCounts(),
    enabled,
  });
}

export function useCriarEmissaoRascunhoMutation() {
  return useMutation({
    mutationFn: (payload: CriarEmissaoRascunhoPayload) => emissaoApi.criarRascunho(payload),
  });
}

export function useAtualizarEmissaoRascunhoMutation() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEmissaoRascunhoPayload }) =>
      emissaoApi.atualizarRascunho(id, payload),
  });
}

export function useConfirmarEmissaoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emissaoApi.confirmar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recebimentos"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["notas"] });
      queryClient.invalidateQueries({ queryKey: ["emissao"] });
    },
  });
}
