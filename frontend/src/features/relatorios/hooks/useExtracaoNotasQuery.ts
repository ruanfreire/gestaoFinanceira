import { useQuery } from "@tanstack/react-query";
import { queryKeys, RELATORIOS_QUERY_KEY } from "@/shared/constants/query-keys";
import { relatoriosService } from "../services/relatorios.service";
import type { ExtracaoNotasFilters } from "../types/relatorios.types";

export { RELATORIOS_QUERY_KEY };

export function useExtracaoNotasQuery(filters: ExtracaoNotasFilters | null) {
  return useQuery({
    queryKey: queryKeys.relatorios.extracao(filters!),
    queryFn: () => relatoriosService.getExtracaoNotas(filters!),
    enabled: filters !== null,
  });
}
