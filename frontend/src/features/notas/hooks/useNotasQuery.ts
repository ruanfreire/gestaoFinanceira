import { useQuery } from "@tanstack/react-query";
import { notasService } from "../services/notas.service";

export const NOTAS_QUERY_KEY = "notas" as const;

export function useNotasQuery(page: number, search: string) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: [NOTAS_QUERY_KEY, page, trimmed],
    queryFn: () =>
      notasService.list({
        page,
        q: trimmed || undefined,
      }),
  });
}
