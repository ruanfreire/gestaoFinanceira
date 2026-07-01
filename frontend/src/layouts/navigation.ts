import type { ComponentType, SVGProps } from "react";
import {
  GridIcon,
  FileIcon,
  DownloadIcon,
  DollarLineIcon,
  PieChartIcon,
} from "@ui/icons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type NavItem = {
  name: string;
  path: string;
  icon: IconComponent;
  /** Se definido, ativo quando pathname.startsWith */
  matchPrefix?: string;
  /** Match exato (ex.: /conciliacao sem subrotas) */
  exact?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navigationGroups: NavGroup[] = [
  {
    label: "Início",
    items: [{ name: "Dashboard", path: "/", icon: GridIcon, exact: true }],
  },
  {
    label: "Notas Fiscais",
    items: [
      { name: "Listagem", path: "/notas", icon: FileIcon, matchPrefix: "/notas" },
      { name: "Importar JSON", path: "/importacoes", icon: DownloadIcon, exact: true },
      {
        name: "Histórico de importações",
        path: "/importacoes/historico",
        icon: FileIcon,
        matchPrefix: "/importacoes/historico",
      },
    ],
  },
  {
    label: "Extratos Bancários",
    items: [
      {
        name: "Importar CSV",
        path: "/importacoes-bancarias",
        icon: DownloadIcon,
        exact: true,
      },
      {
        name: "Histórico de extratos",
        path: "/importacoes-bancarias/historico",
        icon: DollarLineIcon,
        matchPrefix: "/importacoes-bancarias/historico",
      },
    ],
  },
  {
    label: "Conciliação",
    items: [
      { name: "Vínculo manual", path: "/conciliacao", icon: DollarLineIcon, exact: true },
      {
        name: "Sem correspondência",
        path: "/conciliacao/sem-match",
        icon: DollarLineIcon,
        matchPrefix: "/conciliacao/sem-match",
      },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { name: "Extração de Notas", path: "/relatorios/extracao", icon: FileIcon },
      { name: "Fluxo de Caixa", path: "/relatorios/fluxo-caixa", icon: PieChartIcon },
    ],
  },
];

export type BreadcrumbSegment = { label: string; path?: string };

/** Mapa estático de breadcrumbs por padrão de rota */
const breadcrumbRoutes: Array<{
  match: (pathname: string) => boolean;
  segments: BreadcrumbSegment[];
  title: string;
}> = [
  {
    match: (p) => p === "/",
    segments: [{ label: "Dashboard" }],
    title: "Dashboard",
  },
  {
    match: (p) => p === "/notas/new",
    segments: [{ label: "Notas Fiscais", path: "/notas" }, { label: "Nova nota" }],
    title: "Nova Nota",
  },
  {
    match: (p) => p === "/notas",
    segments: [{ label: "Notas Fiscais" }],
    title: "Notas Fiscais",
  },
  {
    match: (p) => p === "/importacoes",
    segments: [{ label: "Notas Fiscais", path: "/notas" }, { label: "Importar JSON" }],
    title: "Importar Notas",
  },
  {
    match: (p) => p === "/importacoes/historico",
    segments: [
      { label: "Notas Fiscais", path: "/notas" },
      { label: "Histórico de importações" },
    ],
    title: "Importações de Faturas",
  },
  {
    match: (p) => /^\/importacoes\/historico\/[^/]+$/.test(p),
    segments: [
      { label: "Notas Fiscais", path: "/notas" },
      { label: "Histórico", path: "/importacoes/historico" },
      { label: "Detalhe" },
    ],
    title: "Detalhe da importação",
  },
  {
    match: (p) => p === "/importacoes-bancarias",
    segments: [{ label: "Extratos", path: "/importacoes-bancarias/historico" }, { label: "Importar CSV" }],
    title: "Importar Extratos",
  },
  {
    match: (p) => p === "/importacoes-bancarias/historico",
    segments: [{ label: "Extratos Bancários" }],
    title: "Histórico de Extratos",
  },
  {
    match: (p) => /^\/importacoes-bancarias\/historico\/[^/]+\/[^/]+$/.test(p),
    segments: [
      { label: "Extratos", path: "/importacoes-bancarias/historico" },
      { label: "Detalhe do extrato" },
    ],
    title: "Detalhe do extrato",
  },
  {
    match: (p) => p === "/conciliacao",
    segments: [{ label: "Conciliação" }],
    title: "Conciliação manual",
  },
  {
    match: (p) => p === "/conciliacao/sem-match",
    segments: [{ label: "Conciliação", path: "/conciliacao" }, { label: "Sem correspondência" }],
    title: "Sem correspondência",
  },
  {
    match: (p) => p === "/relatorios/extracao",
    segments: [{ label: "Relatórios" }, { label: "Extração de Notas" }],
    title: "Extração de Notas",
  },
  {
    match: (p) => p === "/relatorios/fluxo-caixa",
    segments: [{ label: "Relatórios" }, { label: "Fluxo de Caixa" }],
    title: "Fluxo de Caixa",
  },
];

export function resolveBreadcrumb(pathname: string) {
  return breadcrumbRoutes.find((route) => route.match(pathname)) ?? null;
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.path;
  if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
  if (item.path === "/") return pathname === "/";
  if (item.path === "/conciliacao") return pathname === "/conciliacao";
  if (item.path === "/importacoes-bancarias") return pathname === "/importacoes-bancarias";
  return pathname.startsWith(item.path);
}
