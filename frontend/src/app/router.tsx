import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PageLoader } from "@/shared/components/DataTable";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import AppShell from "@/layouts/AppShell";
import SignInPage from "@/features/auth/pages/SignInPage";

const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const NotasListPage = lazy(() => import("@/features/notas/pages/NotasListPage"));
const NotaFormPage = lazy(() => import("@/features/notas/pages/NotaFormPage"));
const ImportarFaturasPage = lazy(
  () => import("@/features/importacoes-faturas/pages/ImportarFaturasPage"),
);
const ImportacoesFaturasHistoricoPage = lazy(
  () => import("@/features/importacoes-faturas/pages/ImportacoesFaturasHistoricoPage"),
);
const ImportacaoFaturaDetalhePage = lazy(
  () => import("@/features/importacoes-faturas/pages/ImportacaoFaturaDetalhePage"),
);
const ImportarExtratosPage = lazy(
  () => import("@/features/importacoes-extratos/pages/ImportarExtratosPage"),
);
const ImportacoesExtratosHistoricoPage = lazy(
  () => import("@/features/importacoes-extratos/pages/ImportacoesExtratosHistoricoPage"),
);
const ImportacaoExtratoDetalhePage = lazy(
  () => import("@/features/importacoes-extratos/pages/ImportacaoExtratoDetalhePage"),
);
const ConciliacaoPage = lazy(() => import("@/features/conciliacao/pages/ConciliacaoPage"));
const ExtracaoNotasPage = lazy(() => import("@/features/relatorios/pages/ExtracaoNotasPage"));
const FluxoCaixaPage = lazy(() => import("@/features/relatorios/pages/FluxoCaixaPage"));

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function ProtectedLayout() {
  return (
    <RequireAuth>
      <AppShell />
    </RequireAuth>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/auth/signin" element={<SignInPage />} />
      <Route path="/" element={<ProtectedLayout />}>
        <Route
          index
          element={
            <LazyPage>
              <DashboardPage />
            </LazyPage>
          }
        />
        <Route
          path="notas"
          element={
            <LazyPage>
              <NotasListPage />
            </LazyPage>
          }
        />
        <Route
          path="notas/new"
          element={
            <LazyPage>
              <NotaFormPage />
            </LazyPage>
          }
        />
        <Route
          path="importacoes"
          element={
            <LazyPage>
              <ImportarFaturasPage />
            </LazyPage>
          }
        />
        <Route
          path="importacoes/historico"
          element={
            <LazyPage>
              <ImportacoesFaturasHistoricoPage />
            </LazyPage>
          }
        />
        <Route
          path="importacoes/historico/:id"
          element={
            <LazyPage>
              <ImportacaoFaturaDetalhePage />
            </LazyPage>
          }
        />
        <Route
          path="importacoes-bancarias"
          element={
            <LazyPage>
              <ImportarExtratosPage />
            </LazyPage>
          }
        />
        <Route
          path="importacoes-bancarias/historico"
          element={
            <LazyPage>
              <ImportacoesExtratosHistoricoPage />
            </LazyPage>
          }
        />
        <Route
          path="importacoes-bancarias/historico/:banco/:id"
          element={
            <LazyPage>
              <ImportacaoExtratoDetalhePage />
            </LazyPage>
          }
        />
        <Route
          path="conciliacao"
          element={
            <LazyPage>
              <ConciliacaoPage />
            </LazyPage>
          }
        />
        <Route
          path="conciliacao/sem-match"
          element={
            <LazyPage>
              <ConciliacaoPage />
            </LazyPage>
          }
        />
        <Route
          path="relatorios/extracao"
          element={
            <LazyPage>
              <ExtracaoNotasPage />
            </LazyPage>
          }
        />
        <Route
          path="relatorios/fluxo-caixa"
          element={
            <LazyPage>
              <FluxoCaixaPage />
            </LazyPage>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
