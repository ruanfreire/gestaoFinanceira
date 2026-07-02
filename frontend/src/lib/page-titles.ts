import { ROUTES } from "@/lib/constants";

const TITLES: Array<{ match: (path: string) => boolean; title: string }> = [
  { match: (p) => p === ROUTES.home, title: "Início" },
  { match: (p) => p === ROUTES.notaNova, title: "Registrar nota" },
  { match: (p) => p.startsWith("/notas"), title: "Minhas notas" },
  { match: (p) => p.startsWith("/recebimentos"), title: "Confirmar recebimentos" },
  { match: (p) => p === ROUTES.arquivosNotas, title: "Enviar notas" },
  { match: (p) => p === ROUTES.arquivosExtratos, title: "Enviar extrato bancário" },
  { match: (p) => p.startsWith("/arquivos/historico"), title: "Histórico de importações" },
  { match: (p) => p === ROUTES.analisesSituacao, title: "Situação das notas" },
  { match: (p) => p === ROUTES.analisesFluxo, title: "Fluxo de caixa" },
  { match: (p) => p === ROUTES.analisesConfig, title: "Configurações de exportação" },
  { match: (p) => p === ROUTES.entrar, title: "Entrar" },
];

export function resolvePageTitle(pathname: string): string {
  const found = TITLES.find((entry) => entry.match(pathname));
  return found?.title ?? "Gestão Financeira";
}

export function formatDocumentTitle(pageTitle: string): string {
  if (pageTitle === "Gestão Financeira") return pageTitle;
  return `${pageTitle} · Gestão Financeira`;
}
