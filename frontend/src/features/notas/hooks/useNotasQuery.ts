import { useQuery } from "@tanstack/react-query";
import { queryKeys, NOTAS_QUERY_KEY } from "@/shared/constants/query-keys";
import { notasService } from "../services/notas.service";

export { NOTAS_QUERY_KEY };

export function useNotasQuery(page: number, search: string) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: queryKeys.notas.list(page, trimmed),
    queryFn: () =>
      notasService.list({
        page,
        q: trimmed || undefined,
      }),
  });
}
