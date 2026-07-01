import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importacoesFaturasService } from "../services/importacoes-faturas.service";
import type { UpdateImportacaoMetadataPayload } from "../types/importacao-fatura.types";
import { IMPORTACOES_FATURAS_QUERY_KEY } from "./useImportacoesFaturasQuery";

export function useUploadImportacaoFaturaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importacoesFaturasService.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_FATURAS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["notas"] });
    },
  });
}

export function useDeleteImportacaoFaturaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => importacoesFaturasService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_FATURAS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateImportacaoFaturaMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateImportacaoMetadataPayload) =>
      importacoesFaturasService.updateMetadata(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_FATURAS_QUERY_KEY, "detail", id] });
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_FATURAS_QUERY_KEY, "list"] });
    },
  });
}

export function useReprocessImportacaoFaturaMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => importacoesFaturasService.reprocess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_FATURAS_QUERY_KEY, "detail", id] });
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_FATURAS_QUERY_KEY, "faturas", id] });
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_FATURAS_QUERY_KEY, "list"] });
      queryClient.invalidateQueries({ queryKey: ["notas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
