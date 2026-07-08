import { Link } from "react-router-dom";
import { Upload, FileSpreadsheet, Link2, FileText, BarChart3, Download } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { navCopy } from "@/shared/copy/pt-BR";
import { cn } from "@/design-system/lib/cn";

const ACTIONS = [
  { to: ROUTES.financeiroEnviarNotas, label: "Enviar notas", icon: Upload, primary: true },
  { to: ROUTES.financeiroEnviarExtrato, label: "Enviar extrato", icon: FileSpreadsheet, primary: true },
  { to: ROUTES.financeiroConfirmar, label: "Confirmar recebimentos", icon: Link2, primary: true },
  { to: ROUTES.financeiroNotaNova, label: "Registrar nota", icon: FileText },
  { to: ROUTES.relatoriosSituacao, label: navCopy.relatoriosSituacao, icon: BarChart3 },
  { to: ROUTES.relatoriosFluxo, label: navCopy.relatoriosFluxo, icon: Download },
] as const;

export function QuickActionsStrip() {
  return (
    <nav aria-label="Ações rápidas" className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.to}
            to={action.to}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-caption font-medium transition-default",
              action.primary
                ? "border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
                : "border-border bg-surface text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {action.label}
          </Link>
        );
      })}
    </nav>
  );
}
