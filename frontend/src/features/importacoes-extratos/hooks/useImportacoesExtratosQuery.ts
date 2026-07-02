import { useQuery } from "@tanstack/react-query";
import { queryKeys, IMPORTACOES_EXTRATOS_QUERY_KEY } from "@/shared/constants/query-keys";
import { importacoesExtratosService } from "../services/importacoes-extratos.service";
import type { BancoExtrato } from "../types/importacao-extrato.types";

export { IMPORTACOES_EXTRATOS_QUERY_KEY };

export function useImportacoesExtratosQuery(
  page: number,
  search: string,
  banco: BancoExtrato | "",
) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: queryKeys.importacoesExtratos.list(page, trimmed, banco),
    queryFn: () =>
      importacoesExtratosService.list({
        page,
        search: trimmed || undefined,
        banco,
      }),
  });
}

export function useImportacaoExtratoQuery(banco: BancoExtrato | undefined, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.importacoesExtratos.detail(banco!, id!),
    queryFn: () => importacoesExtratosService.getById(banco!, id!),
    enabled: Boolean(banco && id),
  });
}

export function useLancamentosExtratoQuery(
  banco: BancoExtrato | undefined,
  id: string | undefined,
  page: number,
  search: string,
  statusFilter: string,
) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: queryKeys.importacoesExtratos.lancamentos(banco!, id!, page, trimmed, statusFilter),
    queryFn: () =>
      importacoesExtratosService.listLancamentos(banco!, id!, {
        page,
        search: trimmed || undefined,
        status_conciliacao: statusFilter || undefined,
        sort: "asc",
      }),
    enabled: Boolean(banco && id),
  });
}
