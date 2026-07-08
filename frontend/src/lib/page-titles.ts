import { ROUTES } from "@/lib/constants";
import { APP_NAME } from "@/lib/brand";
import { navCopy, financeiroCopy, documentosCopy, operacoesCopy, configuracoesCopy } from "@/shared/copy/pt-BR";
import { inferOrgSlugFromPath, stripOrgSlug } from "@/lib/org-path";

const TITLES: Array<{ match: (path: string) => boolean; title: string }> = [
  { match: (p) => p === ROUTES.home, title: navCopy.inicio },
  { match: (p) => p === ROUTES.financeiroNotaNova, title: navCopy.financeiroNovaNota },
  { match: (p) => p.startsWith("/financeiro/notas"), title: financeiroCopy.notasTitle },
  { match: (p) => p.startsWith("/financeiro/confirmar"), title: financeiroCopy.confirmarTitle },
  { match: (p) => p === ROUTES.financeiroEnviarNotas, title: financeiroCopy.enviarNotasTitle },
  { match: (p) => p === ROUTES.financeiroEnviarExtrato, title: financeiroCopy.enviarExtratoTitle },
  { match: (p) => p.startsWith("/financeiro/historico"), title: financeiroCopy.historicoTitle },
  { match: (p) => p === ROUTES.documentosEnviar, title: documentosCopy.enviarTitle },
  { match: (p) => p === ROUTES.documentosPendentes, title: documentosCopy.pendentesTitle },
  { match: (p) => p.startsWith("/documentos/"), title: documentosCopy.detalheTitle },
  { match: (p) => p === ROUTES.documentos, title: documentosCopy.pageTitle },
  { match: (p) => p.startsWith("/financeiro"), title: navCopy.financeiro },
  { match: (p) => p.startsWith("/operacoes"), title: operacoesCopy.confirmarTitle },
  { match: (p) => p === ROUTES.relatoriosSituacao, title: navCopy.relatoriosSituacao },
  { match: (p) => p === ROUTES.relatoriosFluxo, title: navCopy.relatoriosFluxo },
  { match: (p) => p === ROUTES.configuracoes, title: configuracoesCopy.pageTitle },
  { match: (p) => p === ROUTES.configuracoesEmpresa, title: configuracoesCopy.empresa.wizardTitle },
  { match: (p) => p === ROUTES.configuracoesBanco, title: configuracoesCopy.banco.wizardTitle },
  { match: (p) => p === ROUTES.plano, title: configuracoesCopy.plano.title },
  { match: (p) => p === ROUTES.equipe, title: configuracoesCopy.equipe.title },
  { match: (p) => p === ROUTES.perfil, title: configuracoesCopy.perfil.title },
  { match: (p) => p === ROUTES.emissaoNf, title: configuracoesCopy.emissao.title },
  { match: (p) => p === ROUTES.integracoesHonest, title: "Conexão Honest" },
  { match: (p) => p === ROUTES.integracoes, title: configuracoesCopy.integracoes.title },
  { match: (p) => p === ROUTES.entrar, title: "Entrar" },
  { match: (p) => p === ROUTES.esqueciSenha, title: "Esqueci minha senha" },
  { match: (p) => p.startsWith(ROUTES.redefinirSenha), title: "Nova senha" },
];

export function resolvePageTitle(pathname: string, orgSlug?: string): string {
  const slug = orgSlug ?? inferOrgSlugFromPath(pathname);
  const path = stripOrgSlug(pathname, slug);
  const found = TITLES.find((entry) => entry.match(path));
  return found?.title ?? APP_NAME;
}

export function formatDocumentTitle(pageTitle: string): string {
  if (pageTitle === APP_NAME) return pageTitle;
  return `${pageTitle} · ${APP_NAME}`;
}
