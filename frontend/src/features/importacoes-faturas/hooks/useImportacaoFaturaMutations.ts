import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/query-keys";
import { importacoesFaturasService } from "../services/importacoes-faturas.service";
import type { UpdateImportacaoMetadataPayload } from "../types/importacao-fatura.types";

export function useUploadImportacaoFaturaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importacoesFaturasService.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoesFaturas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notas.all });
    },
  });
}

export function useDeleteImportacaoFaturaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => importacoesFaturasService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoesFaturas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateImportacaoFaturaMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateImportacaoMetadataPayload) =>
      importacoesFaturasService.updateMetadata(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoesFaturas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoesFaturas.all });
    },
  });
}

export function useReprocessImportacaoFaturaMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => importacoesFaturasService.reprocess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoesFaturas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoesFaturas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
