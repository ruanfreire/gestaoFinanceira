/** Loaders compartilhados — router lazy + prefetch no hover */
export const lazyRoutes = {
  entrar: () => import("@/features/auth/pages/entrar-page"),
  home: () => import("@/features/home/pages/home-page"),
  notas: () => import("@/features/notas/pages/notas-page"),
  notaNova: () => import("@/features/notas/pages/nota-nova-page"),
  recebimentos: () => import("@/features/recebimentos/pages/recebimentos-page"),
  arquivosNotas: () => import("@/features/arquivos/pages/arquivos-notas-page"),
  arquivosExtratos: () => import("@/features/arquivos/pages/arquivos-extratos-page"),
  arquivosHistorico: () => import("@/features/arquivos/pages/arquivos-historico-page"),
  arquivoNotaDetalhe: () => import("@/features/arquivos/pages/arquivo-nota-detalhe-page"),
  arquivoExtratoDetalhe: () => import("@/features/arquivos/pages/arquivo-extrato-detalhe-page"),
  analisesSituacao: () => import("@/features/analises/pages/analises-situacao-page"),
  analisesFluxo: () => import("@/features/analises/pages/analises-fluxo-page"),
  analisesConfig: () => import("@/features/analises/pages/analises-config-page"),
  notFound: () => import("@/features/errors/not-found-page"),
} as const;
