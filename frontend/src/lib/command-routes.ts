import type { LucideIcon } from "lucide-react";
import {
  Home,
  FileText,
  Link2,
  Upload,
  FileSpreadsheet,
  History,
  BarChart3,
  Settings,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";

export type CommandRoute = {
  id: string;
  label: string;
  to: string;
  keywords: string;
  icon: LucideIcon;
};

export const COMMAND_ROUTES: CommandRoute[] = [
  { id: "home", label: "Início", to: ROUTES.home, keywords: "dashboard central", icon: Home },
  { id: "notas", label: "Minhas notas", to: ROUTES.notas, keywords: "nf fatura lista", icon: FileText },
  {
    id: "recebimentos",
    label: "Confirmar recebimentos",
    to: ROUTES.recebimentos,
    keywords: "conciliação pagamentos pendentes",
    icon: Link2,
  },
  { id: "notas-upload", label: "Enviar notas", to: ROUTES.arquivosNotas, keywords: "importar json arquivo", icon: Upload },
  {
    id: "extratos-upload",
    label: "Enviar extrato bancário",
    to: ROUTES.arquivosExtratos,
    keywords: "importar csv asaas nubank",
    icon: FileSpreadsheet,
  },
  { id: "historico", label: "Histórico de importações", to: ROUTES.arquivosHistorico, keywords: "arquivos passado", icon: History },
  {
    id: "situacao",
    label: "Situação das notas",
    to: ROUTES.analisesSituacao,
    keywords: "relatório extracao análise",
    icon: BarChart3,
  },
  {
    id: "fluxo",
    label: "Fluxo de caixa",
    to: ROUTES.analisesFluxo,
    keywords: "excel exportar planilha",
    icon: BarChart3,
  },
  {
    id: "config",
    label: "Configurações de exportação",
    to: ROUTES.analisesConfig,
    keywords: "padrões fluxo excel",
    icon: Settings,
  },
];
