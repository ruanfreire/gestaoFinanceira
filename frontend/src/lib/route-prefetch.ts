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
  [ROUTES.analisesConfig]: lazyRoutes.analisesConfig,
};

const prefetched = new Set<string>();

export function resolvePrefetchPath(pathname: string): string | undefined {
  if (routeLoaders[pathname]) return pathname;
  if (pathname.startsWith("/notas")) return ROUTES.notas;
  if (pathname.startsWith("/recebimentos")) return ROUTES.recebimentos;
  if (pathname.startsWith("/arquivos/historico/notas/")) return ROUTES.arquivosHistorico;
  if (pathname.startsWith("/arquivos/historico/extratos/")) return ROUTES.arquivosHistorico;
  if (pathname.startsWith("/arquivos")) return ROUTES.arquivosHistorico;
  if (pathname.startsWith("/analises")) return ROUTES.analisesSituacao;
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
