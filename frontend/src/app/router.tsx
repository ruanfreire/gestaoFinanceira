import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AppProviders } from "./providers";
import { PageTitleSync } from "./page-title-sync";
import { RequireClientApp, RequireSuperadmin } from "@/features/auth/require-auth";
import { ProtectedShell } from "@/app/protected-shell";
import { SuperadminShell } from "@/features/platform/components/superadmin-shell";
import { OrgSlugLayout, RootRedirect } from "@/features/org/org-slug-layout";
import { ROUTES } from "@/lib/constants";
import { lazyRoutes } from "@/lib/lazy-routes";
import { Skeleton } from "@/design-system/atoms";
import { useAuth } from "@/features/auth/context";
import { withOrgSlug } from "@/lib/org-path";

const EntrarPage = lazy(lazyRoutes.entrar);
const HomePage = lazy(lazyRoutes.home);
const NotasPage = lazy(lazyRoutes.notas);
const NotaNovaPage = lazy(lazyRoutes.notaNova);
const RecebimentosPage = lazy(lazyRoutes.recebimentos);
const ArquivosNotasPage = lazy(lazyRoutes.arquivosNotas);
const ArquivosImportarBancoPage = lazy(lazyRoutes.arquivosImportarBanco);
const ImportIntelligenceOpsPage = lazy(lazyRoutes.importIntelligenceOps);
const ArquivosHistoricoPage = lazy(lazyRoutes.arquivosHistorico);
const ArquivoNotaDetalhePage = lazy(lazyRoutes.arquivoNotaDetalhe);
const ArquivoExtratoDetalhePage = lazy(lazyRoutes.arquivoExtratoDetalhe);
const AnalisesSituacaoPage = lazy(lazyRoutes.analisesSituacao);
const AnalisesFluxoPage = lazy(lazyRoutes.analisesFluxo);
const PlanoPage = lazy(lazyRoutes.plano);
const EquipePage = lazy(lazyRoutes.equipe);
const PerfilPage = lazy(lazyRoutes.perfil);
const IntegracoesPage = lazy(lazyRoutes.integracoes);
const HonestIntegrationPage = lazy(lazyRoutes.integracoesHonest);
const TomadoresPage = lazy(lazyRoutes.tomadores);
const ConfiguracoesPage = lazy(lazyRoutes.configuracoes);
const ConvitePage = lazy(lazyRoutes.convite);
const NotFoundPage = lazy(lazyRoutes.notFound);
const SignupPage = lazy(lazyRoutes.signup);
const SuperadminDashboardPage = lazy(lazyRoutes.superadminDashboard);
const SuperadminClientsPage = lazy(lazyRoutes.superadminClients);
const SuperadminClientDetailPage = lazy(lazyRoutes.superadminClientDetail);

function PageLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function LegacyRedirect({ to }: { to: string }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to={ROUTES.entrar} replace />;
  const slug = user?.organization?.slug;
  if (!slug) return <Navigate to={ROUTES.entrar} replace />;
  return <Navigate to={withOrgSlug(slug, to)} replace />;
}

/** Redireciona URLs antigas sem slug da organização, preservando o caminho completo. */
function LegacyRedirectPreserve() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to={ROUTES.entrar} replace />;
  const slug = user?.organization?.slug;
  if (!slug) return <Navigate to={ROUTES.entrar} replace />;
  const target = `${withOrgSlug(slug, location.pathname)}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}

export function AppRouter() {
  return (
    <AppProviders>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PageTitleSync />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth/entrar" element={<EntrarPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/auth/signin" element={<Navigate to={ROUTES.entrar} replace />} />
            <Route path="/convite/:token" element={<ConvitePage />} />

            <Route
              path={ROUTES.superadmin}
              element={
                <RequireSuperadmin>
                  <SuperadminShell />
                </RequireSuperadmin>
              }
            >
              <Route index element={<SuperadminDashboardPage />} />
              <Route path="clients" element={<SuperadminClientsPage />} />
              <Route path="clients/:id" element={<SuperadminClientDetailPage />} />
            </Route>

            <Route path="/" element={<RootRedirect />} />

            <Route
              path="/:orgSlug"
              element={
                <RequireClientApp>
                  <OrgSlugLayout />
                </RequireClientApp>
              }
            >
              <Route
                element={
                  <ProtectedShell>
                    <Outlet />
                  </ProtectedShell>
                }
              >
                <Route index element={<HomePage />} />
                <Route path="notas" element={<NotasPage />} />
                <Route path="notas/nova" element={<NotaNovaPage />} />
                <Route path="recebimentos" element={<RecebimentosPage variant="pendente" />} />
                <Route path="recebimentos/sem-correspondencia" element={<RecebimentosPage variant="sem_match" />} />
                <Route path="arquivos/notas" element={<ArquivosNotasPage />} />
                <Route path="arquivos/extratos" element={<Navigate to="importar-banco" replace />} />
                <Route path="arquivos/importar-banco" element={<ArquivosImportarBancoPage />} />
                <Route path="arquivos/historico" element={<ArquivosHistoricoPage />} />
                <Route path="arquivos/historico/notas/:id" element={<ArquivoNotaDetalhePage />} />
                <Route path="arquivos/historico/extratos/:banco/:id" element={<ArquivoExtratoDetalhePage />} />
                <Route path="analises/situacao" element={<AnalisesSituacaoPage />} />
                <Route path="analises/fluxo-caixa" element={<AnalisesFluxoPage />} />
                <Route path="configuracoes" element={<ConfiguracoesPage />} />
                <Route path="configuracoes/plano" element={<PlanoPage />} />
                <Route path="configuracoes/equipe" element={<EquipePage />} />
                <Route path="configuracoes/perfil" element={<PerfilPage />} />
                <Route path="configuracoes/importacao-ia" element={<ImportIntelligenceOpsPage />} />
                <Route path="configuracoes/integracoes" element={<IntegracoesPage />} />
                <Route path="configuracoes/integracoes/honest" element={<HonestIntegrationPage />} />
                <Route path="configuracoes/tomadores" element={<TomadoresPage />} />
              </Route>
            </Route>

            <Route path={ROUTES.notas} element={<LegacyRedirect to={ROUTES.notas} />} />
            <Route path={ROUTES.notaNova} element={<LegacyRedirect to={ROUTES.notaNova} />} />
            <Route path={ROUTES.recebimentos} element={<LegacyRedirect to={ROUTES.recebimentos} />} />
            <Route path={ROUTES.recebimentosSem} element={<LegacyRedirect to={ROUTES.recebimentosSem} />} />
            <Route path={ROUTES.arquivosNotas} element={<LegacyRedirect to={ROUTES.arquivosNotas} />} />
            <Route path={ROUTES.arquivosExtratos} element={<LegacyRedirect to={ROUTES.arquivosExtratos} />} />
            <Route path={ROUTES.arquivosImportarBanco} element={<LegacyRedirect to={ROUTES.arquivosImportarBanco} />} />
            <Route path={ROUTES.arquivosHistorico} element={<LegacyRedirect to={ROUTES.arquivosHistorico} />} />
            <Route path="/arquivos/historico/notas/:id" element={<LegacyRedirectPreserve />} />
            <Route path="/arquivos/historico/extratos/:banco/:id" element={<LegacyRedirectPreserve />} />
            <Route path={ROUTES.analisesSituacao} element={<LegacyRedirect to={ROUTES.analisesSituacao} />} />
            <Route path={ROUTES.analisesFluxo} element={<LegacyRedirect to={ROUTES.analisesFluxo} />} />
            <Route path={ROUTES.analisesConfig} element={<LegacyRedirect to={ROUTES.analisesFluxo} />} />
            <Route path={ROUTES.configuracoes} element={<LegacyRedirect to={ROUTES.configuracoes} />} />
            <Route path={ROUTES.plano} element={<LegacyRedirect to={ROUTES.plano} />} />
            <Route path={ROUTES.equipe} element={<LegacyRedirect to={ROUTES.equipe} />} />
            <Route path={ROUTES.perfil} element={<LegacyRedirect to={ROUTES.perfil} />} />
            <Route path={ROUTES.importIntelligenceOps} element={<LegacyRedirect to={ROUTES.importIntelligenceOps} />} />
            <Route path={ROUTES.integracoes} element={<LegacyRedirect to={ROUTES.integracoes} />} />
            <Route path={ROUTES.integracoesHonest} element={<LegacyRedirect to={ROUTES.integracoesHonest} />} />
            <Route path={ROUTES.tomadores} element={<LegacyRedirect to={ROUTES.tomadores} />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  );
}
