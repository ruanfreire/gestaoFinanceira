export const queryKeys = {
  auth: ["auth"] as const,
  home: (filters: unknown) => ["home", filters] as const,
  homePrevious: (filters: unknown) => ["home", "previous", filters] as const,
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
  signup: "/auth/signup",
  home: "/",
  superadmin: "/superadmin",
  superadminClients: "/superadmin/clients",

  /** Documentos — inbox unificada */
  documentos: "/documentos",
  documentosEnviar: "/documentos/enviar",
  documentosPendentes: "/documentos/pendentes",
  documentoDetalhe: (id: string) => `/documentos/${id}` as const,

  /** Financeiro — tarefas do dia a dia */
  financeiroNotas: "/financeiro/notas",
  financeiroNotaNova: "/financeiro/notas/nova",
  financeiroConfirmar: "/financeiro/confirmar",
  financeiroConfirmarSem: "/financeiro/confirmar/sem-correspondencia",
  financeiroEnviarNotas: "/financeiro/enviar-notas",
  financeiroEnviarExtrato: "/financeiro/enviar-extrato",
  financeiroHistorico: "/financeiro/historico",

  /** Operações — logística em linguagem humana */
  operacoesConfirmar: "/operacoes/confirmar",
  operacoesConfirmarSem: "/operacoes/confirmar/sem-correspondencia",

  /** Relatórios */
  relatoriosSituacao: "/relatorios/situacao",
  relatoriosFluxo: "/relatorios/fluxo-caixa",

  /** Configurações */
  configuracoes: "/configuracoes",
  plano: "/configuracoes/plano",
  equipe: "/configuracoes/equipe",
  perfil: "/configuracoes/perfil",
  integracoes: "/configuracoes/integracoes",
  integracoesHonest: "/configuracoes/integracoes/honest",
  tomadores: "/configuracoes/tomadores",
  emissaoNf: "/configuracoes/emissao-nf",
  configuracoesEmpresa: "/configuracoes/empresa",
  configuracoesBanco: "/configuracoes/banco",
  importIntelligenceOps: "/configuracoes/importacao-ia",
  convite: "/convite",

  // Aliases — código existente; apontam para rotas novas
  notas: "/financeiro/notas",
  notaNova: "/financeiro/notas/nova",
  recebimentos: "/financeiro/confirmar",
  recebimentosSem: "/financeiro/confirmar/sem-correspondencia",
  arquivosNotas: "/financeiro/enviar-notas",
  arquivosExtratos: "/financeiro/enviar-extrato",
  arquivosImportarBanco: "/financeiro/enviar-extrato",
  arquivosHistorico: "/financeiro/historico",
  freteRecebimentos: "/operacoes/confirmar",
  freteRecebimentosSem: "/operacoes/confirmar/sem-correspondencia",
  analisesSituacao: "/relatorios/situacao",
  analisesFluxo: "/relatorios/fluxo-caixa",
  analisesConfig: "/relatorios/configuracoes",
} as const;

/** Rotas antigas — redirects no router */
export const LEGACY_ROUTES = {
  notas: "/notas",
  notaNova: "/notas/nova",
  recebimentos: "/recebimentos",
  recebimentosSem: "/recebimentos/sem-correspondencia",
  arquivosNotas: "/arquivos/notas",
  arquivosExtratos: "/arquivos/extratos",
  arquivosImportarBanco: "/arquivos/importar-banco",
  arquivosHistorico: "/arquivos/historico",
  freteRecebimentos: "/frete/recebimentos",
  freteRecebimentosSem: "/frete/recebimentos/sem-correspondencia",
  analisesSituacao: "/analises/situacao",
  analisesFluxo: "/analises/fluxo-caixa",
  analisesConfig: "/analises/configuracoes",
} as const;

export const USER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  suspended: "Suspenso",
};

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
};
