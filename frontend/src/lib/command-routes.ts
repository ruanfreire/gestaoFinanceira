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
  CreditCard,
  Users,
  Plug,
  Bell,
  FileStack,
  Truck,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { navCopy, configuracoesCopy } from "@/shared/copy/pt-BR";
import type { ModuleKey } from "@/lib/modules";

export type CommandRoute = {
  id: string;
  label: string;
  to?: string;
  action?: "enable-push";
  keywords: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
  module?: ModuleKey;
};

export const COMMAND_ROUTES: CommandRoute[] = [
  { id: "home", label: navCopy.inicio, to: ROUTES.home, keywords: "dashboard central início", icon: Home },
  {
    id: "documentos",
    label: navCopy.documentos,
    to: ROUTES.documentos,
    keywords: "enviar arquivos pasta xml pdf",
    icon: FileStack,
    module: "document_core",
  },
  {
    id: "notas",
    label: navCopy.financeiroNotas,
    to: ROUTES.financeiroNotas,
    keywords: "nf fatura lista notas",
    icon: FileText,
    module: "finance",
  },
  {
    id: "recebimentos",
    label: navCopy.financeiroConfirmar,
    to: ROUTES.financeiroConfirmar,
    keywords: "pagamentos pendentes confirmar recebimento",
    icon: Link2,
    module: "finance",
  },
  {
    id: "operacoes",
    label: navCopy.operacoesConfirmar,
    to: ROUTES.operacoesConfirmar,
    keywords: "entregas transporte confirmar",
    icon: Truck,
    module: "logistics_frete",
  },
  {
    id: "notas-upload",
    label: navCopy.financeiroEnviarNotas,
    to: ROUTES.financeiroEnviarNotas,
    keywords: "importar enviar notas arquivo",
    icon: Upload,
    module: "finance",
  },
  {
    id: "extratos-upload",
    label: navCopy.financeiroEnviarExtrato,
    to: ROUTES.financeiroEnviarExtrato,
    keywords: "importar extrato banco csv",
    icon: FileSpreadsheet,
    module: "finance",
  },
  {
    id: "historico",
    label: navCopy.financeiroHistorico,
    to: ROUTES.financeiroHistorico,
    keywords: "histórico importações passado",
    icon: History,
    module: "finance",
  },
  {
    id: "situacao",
    label: navCopy.relatoriosSituacao,
    to: ROUTES.relatoriosSituacao,
    keywords: "relatório situação emitido recebido",
    icon: BarChart3,
    module: "finance",
  },
  {
    id: "fluxo",
    label: navCopy.relatoriosFluxo,
    to: ROUTES.relatoriosFluxo,
    keywords: "fluxo caixa excel exportar",
    icon: BarChart3,
    module: "finance",
  },
  {
    id: "push",
    label: "Ativar notificações",
    action: "enable-push",
    keywords: "push alerta aviso mensagem browser",
    icon: Bell,
  },
  {
    id: "configuracoes",
    label: navCopy.configuracoes,
    to: ROUTES.configuracoes,
    keywords: "ajustes organização",
    icon: Settings,
    ownerOnly: true,
  },
  {
    id: "plano",
    label: "Plano e assinatura",
    to: ROUTES.plano,
    keywords: "trial assinatura pagamento",
    icon: CreditCard,
    ownerOnly: true,
  },
  {
    id: "perfil",
    label: "Dados da empresa",
    to: ROUTES.perfil,
    keywords: "cnpj razão social telefone",
    icon: Settings,
    ownerOnly: true,
  },
  {
    id: "equipe",
    label: configuracoesCopy.equipe.title,
    to: ROUTES.equipe,
    keywords: "convite membros equipe",
    icon: Users,
    ownerOnly: true,
  },
  {
    id: "integracoes",
    label: configuracoesCopy.integracoes.title,
    to: ROUTES.integracoes,
    keywords: "honest importar notas automaticamente",
    icon: Plug,
    ownerOnly: true,
    module: "integrations_honest",
  },
];
