export const queryKeys = {
  auth: ["auth"] as const,
  home: (filters: unknown) => ["home", filters] as const,
  notas: (params: unknown) => ["notas", params] as const,
  recebimentos: (tab: string) => ["recebimentos", tab] as const,
  recebimentosCounts: ["recebimentos", "counts"] as const,
  candidatas: (source: string, id: string, q: string) =>
    ["candidatas", source, id, q] as const,
  arquivosNotas: (params: unknown) => ["arquivos", "notas", params] as const,
  arquivosNota: (id: string) => ["arquivos", "nota", id] as const,
  arquivosNotaFaturas: (id: string, params: unknown) =>
    ["arquivos", "nota", id, "faturas", params] as const,
  arquivosExtratos: (params: unknown) => ["arquivos", "extratos", params] as const,
  arquivosExtrato: (banco: string, id: string) => ["arquivos", "extrato", banco, id] as const,
  arquivosLancamentos: (banco: string, id: string, params: unknown) =>
    ["arquivos", "lancamentos", banco, id, params] as const,
  analisesExtracao: (filters: unknown) => ["analises", "extracao", filters] as const,
};

export const ROUTES = {
  entrar: "/auth/entrar",
  home: "/",
  notas: "/notas",
  notaNova: "/notas/nova",
  recebimentos: "/recebimentos",
  recebimentosSem: "/recebimentos/sem-correspondencia",
  arquivosNotas: "/arquivos/notas",
  arquivosExtratos: "/arquivos/extratos",
  arquivosHistorico: "/arquivos/historico",
  analisesSituacao: "/analises/situacao",
  analisesFluxo: "/analises/fluxo-caixa",
} as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  em_aberto: "Em aberto",
  parcial: "Parcial",
  pago: "Pago",
};

export const IMPORT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  finished: "Concluída",
  failed: "Falhou",
};

export const CONCILIACAO_STATUS_LABELS: Record<string, string> = {
  extrato: "Extrato",
  conciliado_auto: "Correspondência automática",
  conciliado_manual: "Correspondência manual",
  pendente_vinculo: "Precisa da sua confirmação",
  sem_match: "Pagamentos sem nota",
  ignorado: "Ignorado",
};
