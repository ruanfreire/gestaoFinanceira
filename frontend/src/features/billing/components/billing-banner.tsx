import { PrefetchLink } from "@/design-system/molecules";
import { AlertTriangle, Info } from "lucide-react";
import { Typography } from "@/design-system/atoms";
import { ROUTES } from "@/lib/constants";
import { useOrgPath } from "@/features/org/org-slug-context";
import { useBillingStatus } from "../hooks";

export function BillingBanner() {
  const { data } = useBillingStatus();
  const orgPath = useOrgPath();
  if (!data?.ok) return null;

  const { access, billingStatus } = data;
  if (access.isPastDue) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-subtle px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 flex-1">
          <Typography variant="subtitle">Pagamento pendente</Typography>
          <Typography variant="caption" tone="muted" className="mt-0.5">
            Houve falha na cobrança. Atualize o cartão para evitar interrupção.
          </Typography>
        </div>
        <PrefetchLink
          to={orgPath(ROUTES.plano)}
          className="shrink-0 text-caption font-medium text-primary hover:underline"
        >
          Regularizar
        </PrefetchLink>
      </div>
    );
  }

  if (access.isTrialing && access.trialDaysLeft != null && access.trialDaysLeft <= 7) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-info/30 bg-info-subtle px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
        <div className="min-w-0 flex-1">
          <Typography variant="subtitle">
            {access.trialDaysLeft === 0
              ? "Seu trial termina hoje"
              : `Trial: ${access.trialDaysLeft} dia(s) restante(s)`}
          </Typography>
          <Typography variant="caption" tone="muted" className="mt-0.5">
            Escolha um plano para continuar após o período de teste.
          </Typography>
        </div>
        <PrefetchLink
          to={orgPath(ROUTES.plano)}
          className="shrink-0 text-caption font-medium text-primary hover:underline"
        >
          Ver planos
        </PrefetchLink>
      </div>
    );
  }

  if (billingStatus === "canceled") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <Typography variant="subtitle">Assinatura cancelada</Typography>
          <Typography variant="caption" tone="muted" className="mt-0.5">
            Você mantém acesso até o fim do período já pago.
          </Typography>
        </div>
        <PrefetchLink
          to={orgPath(ROUTES.plano)}
          className="shrink-0 text-caption font-medium text-primary hover:underline"
        >
          Renovar
        </PrefetchLink>
      </div>
    );
  }

  return null;
}
