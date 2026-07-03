import { Link } from "react-router-dom";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Link2,
  BarChart3,
  Download,
  ChevronRight,
} from "lucide-react";
import { Typography } from "@/design-system/atoms";
import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/design-system/lib/cn";

const PRIMARY_ACTIONS = [
  { to: ROUTES.arquivosNotas, label: "Importar notas", description: "Enviar arquivo JSON", icon: Upload },
  { to: ROUTES.arquivosExtratos, label: "Importar extrato", description: "CSV do seu banco", icon: FileSpreadsheet },
  { to: ROUTES.recebimentos, label: "Conciliar pagamentos", description: "Confirmar recebimentos", icon: Link2 },
] as const;

const SECONDARY_ACTIONS = [
  { to: ROUTES.notaNova, label: "Nova nota", icon: FileText },
  { to: ROUTES.analisesSituacao, label: "Extração de notas", icon: BarChart3 },
  { to: ROUTES.analisesFluxo, label: "Fluxo de caixa", icon: Download },
] as const;

function ActionRow({
  to,
  label,
  description,
  icon: Icon,
  primary,
}: {
  to: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-default",
        "hover:border-border hover:bg-muted/50",
        primary && "bg-muted/30",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-default",
          primary
            ? "bg-primary text-primary-foreground group-hover:bg-primary/90"
            : "bg-muted text-muted-foreground group-hover:bg-surface group-hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <Typography variant="subtitle" className="truncate">
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" tone="muted" className="mt-0.5 block truncate">
            {description}
          </Typography>
        )}
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-default group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden
      />
    </Link>
  );
}

export function QuickActionsPanel() {
  return (
    <Card className="h-full">
      <CardHeader title="Ações rápidas" description="Próximos passos recomendados" />
      <CardBody className="space-y-1">
        {PRIMARY_ACTIONS.map((action) => (
          <ActionRow key={action.to} {...action} primary />
        ))}
        <div className="my-2 border-t border-border" />
        <div className="grid gap-0.5">
          {SECONDARY_ACTIONS.map((action) => (
            <ActionRow key={action.to} {...action} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
