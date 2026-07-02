import { useQuery } from "@tanstack/react-query";
import { queryKeys, IMPORTACOES_FATURAS_QUERY_KEY } from "@/shared/constants/query-keys";
import { importacoesFaturasService } from "../services/importacoes-faturas.service";

export { IMPORTACOES_FATURAS_QUERY_KEY };

export function useImportacoesFaturasQuery(page: number, search: string) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: queryKeys.importacoesFaturas.list(page, trimmed),
    queryFn: () =>
      importacoesFaturasService.list({
        page,
        search: trimmed || undefined,
      }),
  });
}

export function useImportacaoFaturaQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.importacoesFaturas.detail(id!),
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
    queryKey: queryKeys.importacoesFaturas.faturas(id!, page, trimmed),
    queryFn: () =>
      importacoesFaturasService.listFaturas(id!, {
        page,
        search: trimmed || undefined,
      }),
    enabled: Boolean(id),
  });
}
