import { Link } from "react-router-dom";
import { Upload, FileSpreadsheet, Link2, FileText, BarChart3, Download } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/design-system/lib/cn";

const ACTIONS = [
  { to: ROUTES.arquivosNotas, label: "Importar notas", icon: Upload, primary: true },
  { to: ROUTES.arquivosExtratos, label: "Importar extrato", icon: FileSpreadsheet, primary: true },
  { to: ROUTES.recebimentos, label: "Conciliar", icon: Link2, primary: true },
  { to: ROUTES.notaNova, label: "Nova nota", icon: FileText },
  { to: ROUTES.analisesSituacao, label: "Extração", icon: BarChart3 },
  { to: ROUTES.analisesFluxo, label: "Fluxo de caixa", icon: Download },
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
