import { ROUTES } from "@/lib/constants";
import { lazyRoutes } from "@/lib/lazy-routes";

type Loader = () => Promise<unknown>;

const routeLoaders: Record<string, Loader> = {
  [ROUTES.home]: lazyRoutes.home,
  [ROUTES.notas]: lazyRoutes.notas,
  [ROUTES.notaNova]: lazyRoutes.notaNova,
  [ROUTES.recebimentos]: lazyRoutes.recebimentos,
  [ROUTES.recebimentosSem]: lazyRoutes.recebimentos,
  [ROUTES.arquivosNotas]: lazyRoutes.arquivosNotas,
  [ROUTES.arquivosExtratos]: lazyRoutes.arquivosExtratos,
  [ROUTES.arquivosHistorico]: lazyRoutes.arquivosHistorico,
  [ROUTES.analisesSituacao]: lazyRoutes.analisesSituacao,
  [ROUTES.analisesFluxo]: lazyRoutes.analisesFluxo,
  [ROUTES.configuracoes]: lazyRoutes.configuracoes,
  [ROUTES.plano]: lazyRoutes.plano,
  [ROUTES.equipe]: lazyRoutes.equipe,
  [ROUTES.perfil]: lazyRoutes.perfil,
  [ROUTES.integracoes]: lazyRoutes.integracoes,
  [ROUTES.integracoesHonest]: lazyRoutes.integracoesHonest,
  [ROUTES.documentos]: lazyRoutes.documentos,
  [ROUTES.operacoesConfirmar]: lazyRoutes.freteRecebimentos,
};

const prefetched = new Set<string>();

export function resolvePrefetchPath(pathname: string): string | undefined {
  if (routeLoaders[pathname]) return pathname;
  if (pathname.startsWith("/financeiro/notas")) return ROUTES.financeiroNotas;
  if (pathname.startsWith("/financeiro/confirmar")) return ROUTES.financeiroConfirmar;
  if (pathname.startsWith("/financeiro/historico")) return ROUTES.financeiroHistorico;
  if (pathname.startsWith("/financeiro")) return ROUTES.financeiroNotas;
  if (pathname.startsWith("/documentos")) return ROUTES.documentos;
  if (pathname.startsWith("/operacoes")) return ROUTES.operacoesConfirmar;
  if (pathname.startsWith("/relatorios")) return ROUTES.relatoriosSituacao;
  if (pathname.startsWith("/notas")) return ROUTES.financeiroNotas;
  if (pathname.startsWith("/recebimentos")) return ROUTES.financeiroConfirmar;
  if (pathname.startsWith("/arquivos/historico")) return ROUTES.financeiroHistorico;
  if (pathname.startsWith("/arquivos")) return ROUTES.financeiroHistorico;
  if (pathname.startsWith("/analises")) return ROUTES.relatoriosSituacao;
  if (pathname.startsWith("/configuracoes")) return ROUTES.configuracoes;
  return undefined;
}

export function prefetchRoute(path: string): void {
  const loader = routeLoaders[path];
  if (!loader || prefetched.has(path)) return;
  prefetched.add(path);
  void loader();
}

export function prefetchRouteFromPathname(pathname: string): void {
  const path = resolvePrefetchPath(pathname);
  if (path) prefetchRoute(path);
}

/** Test helper */
export function resetPrefetchCache(): void {
  prefetched.clear();
}
