import { Link } from "react-router-dom";
import { Upload, FileSpreadsheet, Link2 } from "lucide-react";
import { ROUTES } from "@/lib/constants";

const MOBILE_ACTIONS = [
  { to: ROUTES.arquivosNotas, label: "Notas", icon: Upload },
  { to: ROUTES.arquivosExtratos, label: "Extrato", icon: FileSpreadsheet },
  { to: ROUTES.recebimentos, label: "Conciliar", icon: Link2 },
] as const;

export function MobileQuickActionsBar() {
  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-30 border-t border-border bg-surface/95 px-3 py-2 backdrop-blur lg:hidden"
      aria-label="Ações rápidas"
    >
      <div className="flex gap-2">
        {MOBILE_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-small font-medium transition-default hover:bg-muted"
          >
            <action.icon className="h-4 w-4 shrink-0" aria-hidden />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
