import type { DashboardFilters } from "@/features/dashboard/types/dashboard.types";
import type { ExtracaoNotasFilters } from "@/features/relatorios/types/relatorios.types";

/** Chaves centralizadas do React Query — use estas em hooks e invalidações. */
export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    detail: (filters: DashboardFilters) => ["dashboard", filters] as const,
  },
  notas: {
    all: ["notas"] as const,
    list: (page: number, search: string) => ["notas", page, search] as const,
  },
  importacoesFaturas: {
    all: ["importacoes-faturas"] as const,
    list: (page: number, search: string) => ["importacoes-faturas", "list", page, search] as const,
    detail: (id: string) => ["importacoes-faturas", "detail", id] as const,
    faturas: (id: string, page: number, search: string) =>
      ["importacoes-faturas", "faturas", id, page, search] as const,
  },
  importacoesExtratos: {
    all: ["importacoes-extratos"] as const,
    list: (page: number, search: string, banco: string) =>
      ["importacoes-extratos", "list", page, search, banco] as const,
    detail: (banco: string, id: string) => ["importacoes-extratos", "detail", banco, id] as const,
    lancamentos: (
      banco: string,
      id: string,
      page: number,
      search: string,
      statusFilter: string,
    ) => ["importacoes-extratos", "lancamentos", banco, id, page, search, statusFilter] as const,
  },
  conciliacao: {
    all: ["conciliacao"] as const,
    tab: (tab: string) => ["conciliacao", tab] as const,
    counts: ["conciliacao", "counts"] as const,
  },
  relatorios: {
    all: ["relatorios"] as const,
    extracao: (filters: ExtracaoNotasFilters) => ["relatorios", "extracao", filters] as const,
  },
} as const;

/** @deprecated Use queryKeys.dashboard.all */
export const DASHBOARD_QUERY_KEY = queryKeys.dashboard.all;

/** @deprecated Use queryKeys.notas.all */
export const NOTAS_QUERY_KEY = "notas" as const;

/** @deprecated Use queryKeys.importacoesFaturas.all */
export const IMPORTACOES_FATURAS_QUERY_KEY = "importacoes-faturas" as const;

/** @deprecated Use queryKeys.importacoesExtratos.all */
export const IMPORTACOES_EXTRATOS_QUERY_KEY = "importacoes-extratos" as const;

/** @deprecated Use queryKeys.conciliacao.all */
export const CONCILIACAO_QUERY_KEY = "conciliacao" as const;

/** @deprecated Use queryKeys.relatorios.all */
export const RELATORIOS_QUERY_KEY = "relatorios" as const;
