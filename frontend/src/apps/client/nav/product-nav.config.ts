import {
  Home,
  FileStack,
  Wallet,
  Truck,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { navCopy } from "@/shared/copy/pt-BR";
import type { ModuleKey } from "@/lib/modules";

export type ProductNavSectionId = "documentos" | "financeiro" | "operacoes" | "relatorios";

export type ProductNavItem = {
  id: string;
  to: string;
  label: string;
  icon?: LucideIcon;
  module?: ModuleKey;
  badgeKey?: "recebimentos";
  ownerOnly?: boolean;
};

export type ProductNavSection = {
  id: ProductNavSectionId;
  label: string;
  module?: ModuleKey;
  items: ProductNavItem[];
};

/** Itens de primeiro nível — máximo 6, orientados a intenção. */
export const PRODUCT_PRIMARY_NAV: ProductNavItem[] = [
  { id: "inicio", to: ROUTES.home, label: navCopy.inicio, icon: Home },
  {
    id: "documentos",
    to: ROUTES.documentos,
    label: navCopy.documentos,
    icon: FileStack,
    module: "document_core",
  },
  {
    id: "operacoes",
    to: ROUTES.operacoesConfirmar,
    label: navCopy.operacoes,
    icon: Truck,
    module: "logistics_frete",
  },
  {
    id: "configuracoes",
    to: ROUTES.configuracoes,
    label: navCopy.configuracoes,
    icon: Settings,
    ownerOnly: true,
  },
];

/** Tarefas agrupadas por área — nunca expõe nome de módulo técnico. */
export const PRODUCT_SECTION_NAV: ProductNavSection[] = [
  {
    id: "financeiro",
    label: navCopy.financeiro,
    module: "finance",
    items: [
      { id: "fin-notas", to: ROUTES.financeiroNotas, label: navCopy.financeiroNotas, module: "finance" },
      {
        id: "fin-confirmar",
        to: ROUTES.financeiroConfirmar,
        label: navCopy.financeiroConfirmar,
        module: "finance",
        badgeKey: "recebimentos",
      },
      { id: "fin-enviar-notas", to: ROUTES.financeiroEnviarNotas, label: navCopy.financeiroEnviarNotas, module: "finance" },
      { id: "fin-enviar-extrato", to: ROUTES.financeiroEnviarExtrato, label: navCopy.financeiroEnviarExtrato, module: "finance" },
      { id: "fin-historico", to: ROUTES.financeiroHistorico, label: navCopy.financeiroHistorico, module: "finance" },
    ],
  },
  {
    id: "relatorios",
    label: navCopy.relatorios,
    module: "finance",
    items: [
      { id: "rel-situacao", to: ROUTES.relatoriosSituacao, label: navCopy.relatoriosSituacao, module: "finance" },
      { id: "rel-fluxo", to: ROUTES.relatoriosFluxo, label: navCopy.relatoriosFluxo, module: "finance" },
    ],
  },
];
