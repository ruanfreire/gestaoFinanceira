import { useQuery } from "@tanstack/react-query";
import { importacoesExtratosService } from "../services/importacoes-extratos.service";
import type { BancoExtrato } from "../types/importacao-extrato.types";

export const IMPORTACOES_EXTRATOS_QUERY_KEY = "importacoes-extratos" as const;

export function useImportacoesExtratosQuery(
  page: number,
  search: string,
  banco: BancoExtrato | "",
) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: [IMPORTACOES_EXTRATOS_QUERY_KEY, "list", page, trimmed, banco],
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
    queryKey: [IMPORTACOES_EXTRATOS_QUERY_KEY, "detail", banco, id],
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
    queryKey: [IMPORTACOES_EXTRATOS_QUERY_KEY, "lancamentos", banco, id, page, trimmed, statusFilter],
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
