import { useQuery } from "@tanstack/react-query";
import { importacoesFaturasService } from "../services/importacoes-faturas.service";

export const IMPORTACOES_FATURAS_QUERY_KEY = "importacoes-faturas" as const;

export function useImportacoesFaturasQuery(page: number, search: string) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: [IMPORTACOES_FATURAS_QUERY_KEY, "list", page, trimmed],
    queryFn: () =>
      importacoesFaturasService.list({
        page,
        search: trimmed || undefined,
      }),
  });
}

export function useImportacaoFaturaQuery(id: string | undefined) {
  return useQuery({
    queryKey: [IMPORTACOES_FATURAS_QUERY_KEY, "detail", id],
    queryFn: () => importacoesFaturasService.getById(id!),
    enabled: Boolean(id),
  });
}

export function useImportacaoFaturasListQuery(
  id: string | undefined,
  page: number,
  search: string,
) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: [IMPORTACOES_FATURAS_QUERY_KEY, "faturas", id, page, trimmed],
    queryFn: () =>
      importacoesFaturasService.listFaturas(id!, {
        page,
        search: trimmed || undefined,
      }),
    enabled: Boolean(id),
  });
}
