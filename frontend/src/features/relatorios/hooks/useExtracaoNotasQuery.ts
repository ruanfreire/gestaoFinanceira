import { useQuery } from "@tanstack/react-query";
import { relatoriosService } from "../services/relatorios.service";
import type { ExtracaoNotasFilters } from "../types/relatorios.types";

export const RELATORIOS_QUERY_KEY = "relatorios" as const;

export function useExtracaoNotasQuery(filters: ExtracaoNotasFilters | null) {
  return useQuery({
    queryKey: [RELATORIOS_QUERY_KEY, "extracao", filters],
    queryFn: () => relatoriosService.getExtracaoNotas(filters!),
    enabled: filters !== null,
  });
}
