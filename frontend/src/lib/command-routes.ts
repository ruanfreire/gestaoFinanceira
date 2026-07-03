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
} from "lucide-react";
import { ROUTES } from "@/lib/constants";

export type CommandRoute = {
  id: string;
  label: string;
  to?: string;
  action?: "enable-push";
  keywords: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
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
    keywords: "importar csv extrato banco",
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
    id: "push",
    label: "Ativar notificações push",
    action: "enable-push",
    keywords: "push alerta aviso mensagem browser",
    icon: Bell,
  },
  {
    id: "configuracoes",
    label: "Configurações da organização",
    to: ROUTES.configuracoes,
    keywords: "plano equipe assinatura",
    icon: Settings,
    ownerOnly: true,
  },
  {
    id: "plano",
    label: "Plano e assinatura",
    to: ROUTES.plano,
    keywords: "billing stripe trial assinatura",
    icon: CreditCard,
    ownerOnly: true,
  },
  {
    id: "perfil",
    label: "Perfil da organização",
    to: ROUTES.perfil,
    keywords: "cnpj razão social empresa telefone",
    icon: Settings,
    ownerOnly: true,
  },
  {
    id: "equipe",
    label: "Equipe",
    to: ROUTES.equipe,
    keywords: "convite membros operador proprietário",
    icon: Users,
    ownerOnly: true,
  },
  {
    id: "integracoes",
    label: "Integrações",
    to: ROUTES.integracoes,
    keywords: "honest conexões externas api",
    icon: Plug,
    ownerOnly: true,
  },
  {
    id: "integracao-honest",
    label: "Integração Honest",
    to: ROUTES.integracoesHonest,
    keywords: "honest json notas automático sync sincronizar links exportação",
    icon: Plug,
    ownerOnly: true,
  },
];
