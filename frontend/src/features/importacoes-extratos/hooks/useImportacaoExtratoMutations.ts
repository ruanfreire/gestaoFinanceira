import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importacoesExtratosService } from "../services/importacoes-extratos.service";
import type {
  BancoExtrato,
  UpdateImportacaoExtratoMetadataPayload,
} from "../types/importacao-extrato.types";
import { IMPORTACOES_EXTRATOS_QUERY_KEY } from "./useImportacoesExtratosQuery";

export function useUploadExtratoMutation(banco: BancoExtrato) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importacoesExtratosService.upload(banco, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_EXTRATOS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteImportacaoExtratoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ banco, id }: { banco: BancoExtrato; id: string }) =>
      importacoesExtratosService.remove(banco, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_EXTRATOS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateImportacaoExtratoMutation(banco: BancoExtrato, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateImportacaoExtratoMetadataPayload) =>
      importacoesExtratosService.updateMetadata(banco, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_EXTRATOS_QUERY_KEY, "detail", banco, id] });
      queryClient.invalidateQueries({ queryKey: [IMPORTACOES_EXTRATOS_QUERY_KEY, "list"] });
    },
  });
}
