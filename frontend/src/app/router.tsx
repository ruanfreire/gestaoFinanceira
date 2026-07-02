import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProviders } from "./providers";
import { PageTitleSync } from "./page-title-sync";
import { RequireAuth } from "@/features/auth/require-auth";
import { ProtectedShell } from "@/app/protected-shell";
import { ROUTES } from "@/lib/constants";
import { lazyRoutes } from "@/lib/lazy-routes";
import { Skeleton } from "@/design-system/atoms";

const EntrarPage = lazy(lazyRoutes.entrar);
const HomePage = lazy(lazyRoutes.home);
const NotasPage = lazy(lazyRoutes.notas);
const NotaNovaPage = lazy(lazyRoutes.notaNova);
const RecebimentosPage = lazy(lazyRoutes.recebimentos);
const ArquivosNotasPage = lazy(lazyRoutes.arquivosNotas);
const ArquivosExtratosPage = lazy(lazyRoutes.arquivosExtratos);
const ArquivosHistoricoPage = lazy(lazyRoutes.arquivosHistorico);
const ArquivoNotaDetalhePage = lazy(lazyRoutes.arquivoNotaDetalhe);
const ArquivoExtratoDetalhePage = lazy(lazyRoutes.arquivoExtratoDetalhe);
const AnalisesSituacaoPage = lazy(lazyRoutes.analisesSituacao);
const AnalisesFluxoPage = lazy(lazyRoutes.analisesFluxo);
const AnalisesConfigPage = lazy(lazyRoutes.analisesConfig);
const NotFoundPage = lazy(lazyRoutes.notFound);

function PageLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <ProtectedShell>{children}</ProtectedShell>
    </RequireAuth>
  );
}

export function AppRouter() {
  return (
    <AppProviders>
      <BrowserRouter>
        <PageTitleSync />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth/entrar" element={<EntrarPage />} />
            <Route path="/auth/signin" element={<Navigate to={ROUTES.entrar} replace />} />

            <Route
              path={ROUTES.home}
              element={
                <ProtectedLayout>
                  <HomePage />
                </ProtectedLayout>
              }
            />
            <Route
              path={ROUTES.notas}
              element={
                <ProtectedLayout>
                  <NotasPage />
                </ProtectedLayout>
              }
            />
            <Route
              path={ROUTES.notaNova}
              element={
                <ProtectedLayout>
                  <NotaNovaPage />
                </ProtectedLayout>
              }
            />
            <Route
              path={ROUTES.recebimentos}
              element={
                <ProtectedLayout>
                  <RecebimentosPage variant="pendente" />
                </ProtectedLayout>
              }
            />
            <Route
              path={ROUTES.recebimentosSem}
              element={
                <ProtectedLayout>
                  <RecebimentosPage variant="sem_match" />
                </ProtectedLayout>
              }
            />
            <Route
              path={ROUTES.arquivosNotas}
              element={
                <ProtectedLayout>
                  <ArquivosNotasPage />
                </ProtectedLayout>
              }
            />
            <Route
              path={ROUTES.arquivosExtratos}
              element={
                <ProtectedLayout>
                  <ArquivosExtratosPage />
                </ProtectedLayout>
              }
            />
            <Route
              path={ROUTES.arquivosHistorico}
              element={
                <ProtectedLayout>
                  <ArquivosHistoricoPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/arquivos/historico/notas/:id"
              element={
                <ProtectedLayout>
                  <ArquivoNotaDetalhePage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/arquivos/historico/extratos/:banco/:id"
              element={
                <ProtectedLayout>
                  <ArquivoExtratoDetalhePage />
                </ProtectedLayout>
              }
            />
            <Route
              path={ROUTES.analisesSituacao}
              element={
                <ProtectedLayout>
                  <AnalisesSituacaoPage />
                </ProtectedLayout>
              }
            />
            <Route
              path={ROUTES.analisesFluxo}
              element={
                <ProtectedLayout>
                  <AnalisesFluxoPage />
                </ProtectedLayout>
              }
            />
            <Route
              path={ROUTES.analisesConfig}
              element={
                <ProtectedLayout>
                  <AnalisesConfigPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="*"
              element={<NotFoundPage />}
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  );
}
