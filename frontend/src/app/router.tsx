import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProviders } from "./providers";
import { RequireAuth } from "@/features/auth/require-auth";
import { ProtectedShell } from "@/app/protected-shell";
import { ROUTES } from "@/lib/constants";
import { Skeleton } from "@/design-system/atoms";

const EntrarPage = lazy(() => import("@/features/auth/pages/entrar-page"));
const HomePage = lazy(() => import("@/features/home/pages/home-page"));
const NotasPage = lazy(() => import("@/features/notas/pages/notas-page"));
const NotaNovaPage = lazy(() => import("@/features/notas/pages/nota-nova-page"));
const RecebimentosPage = lazy(() => import("@/features/recebimentos/pages/recebimentos-page"));
const ArquivosNotasPage = lazy(() => import("@/features/arquivos/pages/arquivos-notas-page"));
const ArquivosExtratosPage = lazy(() => import("@/features/arquivos/pages/arquivos-extratos-page"));
const ArquivosHistoricoPage = lazy(() => import("@/features/arquivos/pages/arquivos-historico-page"));
const ArquivoNotaDetalhePage = lazy(() => import("@/features/arquivos/pages/arquivo-nota-detalhe-page"));
const ArquivoExtratoDetalhePage = lazy(() => import("@/features/arquivos/pages/arquivo-extrato-detalhe-page"));
const AnalisesSituacaoPage = lazy(() => import("@/features/analises/pages/analises-situacao-page"));
const AnalisesFluxoPage = lazy(() => import("@/features/analises/pages/analises-fluxo-page"));
const NotFoundPage = lazy(() => import("@/features/errors/not-found-page"));

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
              path="*"
              element={<NotFoundPage />}
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  );
}
