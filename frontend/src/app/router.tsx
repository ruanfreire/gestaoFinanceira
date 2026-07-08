import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AppProviders } from "./providers";
import { PageTitleSync } from "./page-title-sync";
import { RequireClientApp, RequireSuperadmin } from "@/features/auth/require-auth";
import { ProtectedShell } from "@/app/protected-shell";
import { SuperadminShell } from "@/features/platform/components/superadmin-shell";
import { OrgSlugLayout, RootRedirect } from "@/features/org/org-slug-layout";
import { ROUTES, LEGACY_ROUTES } from "@/lib/constants";
import { lazyRoutes } from "@/lib/lazy-routes";
import { Skeleton } from "@/design-system/atoms";
import { useAuth } from "@/features/auth/context";
import { withOrgSlug } from "@/lib/org-path";
import { RequireModule } from "@/features/org/require-module";

const EntrarPage = lazy(lazyRoutes.entrar);
const HomePage = lazy(lazyRoutes.home);
const NotasPage = lazy(lazyRoutes.notas);
const NotaNovaPage = lazy(lazyRoutes.notaNova);
const RecebimentosPage = lazy(lazyRoutes.recebimentos);
const ArquivosNotasPage = lazy(lazyRoutes.arquivosNotas);
const ArquivosImportarBancoPage = lazy(lazyRoutes.arquivosImportarBanco);
const ImportIntelligenceOpsPage = lazy(lazyRoutes.importIntelligenceOps);
const ArquivosHistoricoPage = lazy(lazyRoutes.arquivosHistorico);
const DocumentosPage = lazy(lazyRoutes.documentos);
const DocumentosEnviarPage = lazy(lazyRoutes.documentosEnviar);
const DocumentosPendentesPage = lazy(lazyRoutes.documentosPendentes);
const DocumentoDetalhePage = lazy(lazyRoutes.documentoDetalhe);
const FreteRecebimentosPage = lazy(lazyRoutes.freteRecebimentos);
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
const EmissaoNfConfigPage = lazy(lazyRoutes.emissaoNf);
const ConfiguracoesPage = lazy(lazyRoutes.configuracoes);
const ConfiguracoesEmpresaPage = lazy(lazyRoutes.configuracoesEmpresa);
const ConfiguracoesBancoPage = lazy(lazyRoutes.configuracoesBanco);
const ConvitePage = lazy(lazyRoutes.convite);
const NotFoundPage = lazy(lazyRoutes.notFound);
const SignupPage = lazy(lazyRoutes.signup);
const SuperadminDashboardPage = lazy(lazyRoutes.superadminDashboard);
const SuperadminClientsPage = lazy(lazyRoutes.superadminClients);
const SuperadminClientDetailPage = lazy(lazyRoutes.superadminClientDetail);
const FinanceiroLayout = lazy(() => import("@/apps/client/layouts/financeiro-layout"));

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

                <Route path="financeiro" element={<FinanceiroLayout />}>
                  <Route path="notas" element={<NotasPage />} />
                  <Route path="notas/nova" element={<NotaNovaPage />} />
                  <Route path="confirmar" element={<RecebimentosPage variant="pendente" />} />
                  <Route path="confirmar/sem-correspondencia" element={<RecebimentosPage variant="sem_match" />} />
                  <Route path="enviar-notas" element={<ArquivosNotasPage />} />
                  <Route path="enviar-extrato" element={<ArquivosImportarBancoPage />} />
                  <Route path="historico" element={<ArquivosHistoricoPage />} />
                  <Route path="historico/notas/:id" element={<ArquivoNotaDetalhePage />} />
                  <Route path="historico/extratos/:banco/:id" element={<ArquivoExtratoDetalhePage />} />
                </Route>

                <Route
                  path="documentos"
                  element={
                    <RequireModule module="document_core">
                      <Outlet />
                    </RequireModule>
                  }
                >
                  <Route index element={<DocumentosPage />} />
                  <Route path="enviar" element={<DocumentosEnviarPage />} />
                  <Route path="pendentes" element={<DocumentosPendentesPage />} />
                  <Route path=":id" element={<DocumentoDetalhePage />} />
                </Route>

                <Route
                  path="operacoes/confirmar"
                  element={
                    <RequireModule module="logistics_frete">
                      <FreteRecebimentosPage variant="pendente" />
                    </RequireModule>
                  }
                />
                <Route
                  path="operacoes/confirmar/sem-correspondencia"
                  element={
                    <RequireModule module="logistics_frete">
                      <FreteRecebimentosPage variant="sem_match" />
                    </RequireModule>
                  }
                />

                <Route path="relatorios/situacao" element={<AnalisesSituacaoPage />} />
                <Route path="relatorios/fluxo-caixa" element={<AnalisesFluxoPage />} />

                <Route path="configuracoes" element={<ConfiguracoesPage />} />
                <Route path="configuracoes/empresa" element={<ConfiguracoesEmpresaPage />} />
                <Route path="configuracoes/banco" element={<ConfiguracoesBancoPage />} />
                <Route path="configuracoes/plano" element={<PlanoPage />} />
                <Route path="configuracoes/equipe" element={<EquipePage />} />
                <Route path="configuracoes/perfil" element={<PerfilPage />} />
                <Route path="configuracoes/importacao-ia" element={<ImportIntelligenceOpsPage />} />
                <Route path="configuracoes/integracoes" element={<IntegracoesPage />} />
                <Route path="configuracoes/integracoes/honest" element={<HonestIntegrationPage />} />
                <Route path="configuracoes/tomadores" element={<TomadoresPage />} />
                <Route path="configuracoes/emissao-nf" element={<EmissaoNfConfigPage />} />

                <Route path="notas" element={<Navigate to="financeiro/notas" replace />} />
                <Route path="notas/nova" element={<Navigate to="financeiro/notas/nova" replace />} />
                <Route path="recebimentos" element={<Navigate to="financeiro/confirmar" replace />} />
                <Route path="recebimentos/sem-correspondencia" element={<Navigate to="financeiro/confirmar/sem-correspondencia" replace />} />
                <Route path="arquivos/notas" element={<Navigate to="financeiro/enviar-notas" replace />} />
                <Route path="arquivos/extratos" element={<Navigate to="financeiro/enviar-extrato" replace />} />
                <Route path="arquivos/importar-banco" element={<Navigate to="financeiro/enviar-extrato" replace />} />
                <Route path="arquivos/historico" element={<Navigate to="financeiro/historico" replace />} />
                <Route path="arquivos/historico/notas/:id" element={<ArquivoNotaDetalhePage />} />
                <Route path="arquivos/historico/extratos/:banco/:id" element={<ArquivoExtratoDetalhePage />} />
                <Route path="frete/recebimentos" element={<Navigate to="operacoes/confirmar" replace />} />
                <Route path="frete/recebimentos/sem-correspondencia" element={<Navigate to="operacoes/confirmar/sem-correspondencia" replace />} />
                <Route path="analises/situacao" element={<Navigate to="relatorios/situacao" replace />} />
                <Route path="analises/fluxo-caixa" element={<Navigate to="relatorios/fluxo-caixa" replace />} />
              </Route>
            </Route>

            <Route path={LEGACY_ROUTES.notas} element={<LegacyRedirect to={ROUTES.financeiroNotas} />} />
            <Route path={LEGACY_ROUTES.notaNova} element={<LegacyRedirect to={ROUTES.financeiroNotaNova} />} />
            <Route path={LEGACY_ROUTES.recebimentos} element={<LegacyRedirect to={ROUTES.financeiroConfirmar} />} />
            <Route path={LEGACY_ROUTES.recebimentosSem} element={<LegacyRedirect to={ROUTES.financeiroConfirmarSem} />} />
            <Route path={LEGACY_ROUTES.arquivosNotas} element={<LegacyRedirect to={ROUTES.financeiroEnviarNotas} />} />
            <Route path={LEGACY_ROUTES.arquivosExtratos} element={<LegacyRedirect to={ROUTES.financeiroEnviarExtrato} />} />
            <Route path={LEGACY_ROUTES.arquivosImportarBanco} element={<LegacyRedirect to={ROUTES.financeiroEnviarExtrato} />} />
            <Route path={ROUTES.documentos} element={<LegacyRedirect to={ROUTES.documentos} />} />
            <Route path={LEGACY_ROUTES.freteRecebimentos} element={<LegacyRedirect to={ROUTES.operacoesConfirmar} />} />
            <Route path={LEGACY_ROUTES.freteRecebimentosSem} element={<LegacyRedirect to={ROUTES.operacoesConfirmarSem} />} />
            <Route path={LEGACY_ROUTES.arquivosHistorico} element={<LegacyRedirect to={ROUTES.financeiroHistorico} />} />
            <Route path="/arquivos/historico/notas/:id" element={<LegacyRedirectPreserve />} />
            <Route path="/arquivos/historico/extratos/:banco/:id" element={<LegacyRedirectPreserve />} />
            <Route path="/financeiro/historico/notas/:id" element={<LegacyRedirectPreserve />} />
            <Route path="/financeiro/historico/extratos/:banco/:id" element={<LegacyRedirectPreserve />} />
            <Route path={LEGACY_ROUTES.analisesSituacao} element={<LegacyRedirect to={ROUTES.relatoriosSituacao} />} />
            <Route path={LEGACY_ROUTES.analisesFluxo} element={<LegacyRedirect to={ROUTES.relatoriosFluxo} />} />
            <Route path={LEGACY_ROUTES.analisesConfig} element={<LegacyRedirect to={ROUTES.relatoriosFluxo} />} />
            <Route path={ROUTES.configuracoes} element={<LegacyRedirect to={ROUTES.configuracoes} />} />
            <Route path={ROUTES.configuracoesEmpresa} element={<LegacyRedirect to={ROUTES.configuracoesEmpresa} />} />
            <Route path={ROUTES.configuracoesBanco} element={<LegacyRedirect to={ROUTES.configuracoesBanco} />} />
            <Route path={ROUTES.plano} element={<LegacyRedirect to={ROUTES.plano} />} />
            <Route path={ROUTES.equipe} element={<LegacyRedirect to={ROUTES.equipe} />} />
            <Route path={ROUTES.perfil} element={<LegacyRedirect to={ROUTES.perfil} />} />
            <Route path={ROUTES.importIntelligenceOps} element={<LegacyRedirect to={ROUTES.importIntelligenceOps} />} />
            <Route path={ROUTES.integracoes} element={<LegacyRedirect to={ROUTES.integracoes} />} />
            <Route path={ROUTES.integracoesHonest} element={<LegacyRedirect to={ROUTES.integracoesHonest} />} />
            <Route path={ROUTES.tomadores} element={<LegacyRedirect to={ROUTES.tomadores} />} />
            <Route path={ROUTES.emissaoNf} element={<LegacyRedirect to={ROUTES.emissaoNf} />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  );
}
