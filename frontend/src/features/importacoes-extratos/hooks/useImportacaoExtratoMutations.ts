import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/query-keys";
import { importacoesExtratosService } from "../services/importacoes-extratos.service";
import type {
  BancoExtrato,
  UpdateImportacaoExtratoMetadataPayload,
} from "../types/importacao-extrato.types";

export function useUploadExtratoMutation(banco: BancoExtrato) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importacoesExtratosService.upload(banco, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoesExtratos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteImportacaoExtratoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ banco, id }: { banco: BancoExtrato; id: string }) =>
      importacoesExtratosService.remove(banco, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoesExtratos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateImportacaoExtratoMutation(banco: BancoExtrato, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateImportacaoExtratoMetadataPayload) =>
      importacoesExtratosService.updateMetadata(banco, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoesExtratos.detail(banco, id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoesExtratos.all });
    },
  });
}
