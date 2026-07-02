import { useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, CreditCard } from "lucide-react";
import { PageHeader, ErrorState } from "@/design-system/molecules";
import { Badge, Button, Typography } from "@/design-system/atoms";
import { useToast } from "@/app/toast-provider";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useBillingCheckout, useBillingPlans, useBillingPortal, useBillingStatus } from "../hooks";
import type { BillingPlanOption } from "../api";

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  starter: "Starter",
  pro: "Pro",
};

function UsageMeter({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number | null;
}) {
  if (max == null) {
    return (
      <div className="flex items-center justify-between gap-3 text-caption">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{used.toLocaleString("pt-BR")} · ilimitado</span>
      </div>
    );
  }

  const ratio = Math.min(used / max, 1);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-caption">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {used.toLocaleString("pt-BR")} / {max.toLocaleString("pt-BR")}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/80 transition-default"
          style={{ width: `${Math.max(ratio * 100, used > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  current,
  loading,
  onSelect,
}: {
  plan: BillingPlanOption;
  current: boolean;
  loading: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-xl border p-5 ${
        current ? "border-primary/40 bg-primary/5" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Typography variant="subtitle">{plan.name}</Typography>
          <Typography variant="caption" tone="muted" className="mt-1">
            {plan.description}
          </Typography>
        </div>
        {current && <Badge variant="info">Atual</Badge>}
      </div>

      <Typography variant="h2" as="p" className="mt-4">
        {plan.priceLabel}
      </Typography>

      <ul className="mt-4 space-y-2 text-caption text-muted-foreground">
        <li>
          {plan.limits.maxNotas == null
            ? "Notas ilimitadas"
            : `Até ${plan.limits.maxNotas.toLocaleString("pt-BR")} notas`}
        </li>
        <li>
          {plan.limits.maxImportsPerMonth == null
            ? "Importações ilimitadas"
            : `Até ${plan.limits.maxImportsPerMonth} importações/mês`}
        </li>
      </ul>

      <div className="mt-5">
        {current ? (
          <Button variant="outline" className="w-full" disabled>
            Plano ativo
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={onSelect}
            loading={loading}
            disabled={!plan.available}
          >
            {plan.available ? "Assinar" : "Indisponível"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PlanoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const statusQuery = useBillingStatus();
  const plansQuery = useBillingPlans();
  const checkout = useBillingCheckout();
  const portal = useBillingPortal();

  useEffect(() => {
    const checkoutResult = params.get("checkout");
    if (checkoutResult === "success") {
      toast("Assinatura iniciada com sucesso", "success");
      params.delete("checkout");
      setParams(params, { replace: true });
      statusQuery.refetch();
    }
    if (checkoutResult === "cancel") {
      toast("Checkout cancelado", "info");
      params.delete("checkout");
      setParams(params, { replace: true });
    }
  }, [params, setParams, statusQuery, toast]);

  if (!isTenantOwner(user)) {
    return <Navigate to={ROUTES.home} replace />;
  }

  if (statusQuery.isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl space-y-6">
        <PageHeader title="Plano e assinatura" description="Carregando informações de billing…" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </motion.div>
    );
  }

  if (statusQuery.isError || !statusQuery.data?.ok) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl space-y-6">
        <PageHeader title="Plano e assinatura" />
        <ErrorState message="Não foi possível carregar o plano." onRetry={() => statusQuery.refetch()} />
      </motion.div>
    );
  }

  const status = statusQuery.data;
  const plans = plansQuery.data ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Plano e assinatura"
        description="Gerencie trial, limites e pagamento da sua organização"
        actions={
          status.hasSubscription ? (
            <Button
              variant="outline"
              size="sm"
              icon={CreditCard}
              onClick={() => portal.mutate()}
              loading={portal.isPending}
              disabled={!status.stripeConfigured}
            >
              Gerenciar assinatura
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-surface/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Typography variant="overline" tone="muted">
                Plano atual
              </Typography>
              <Typography variant="h2" as="p" className="mt-1">
                {PLAN_LABELS[status.plan] ?? status.plan}
              </Typography>
              <Typography variant="caption" tone="muted" className="mt-2 block">
                Status: {status.billingStatus}
                {status.trialEndsAt && status.access.isTrialing
                  ? ` · trial até ${formatDate(status.trialEndsAt)}`
                  : ""}
                {status.currentPeriodEnd && status.billingStatus === "active"
                  ? ` · renova em ${formatDate(status.currentPeriodEnd)}`
                  : ""}
              </Typography>
            </div>
            {status.access.isTrialing && status.access.trialDaysLeft != null && (
              <Badge variant="warning">{status.access.trialDaysLeft} dia(s) de trial</Badge>
            )}
            {status.billingStatus === "active" && (
              <Badge variant="success" className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Ativo
              </Badge>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <UsageMeter label="Notas" used={status.usage.notas} max={status.limits.maxNotas} />
            <UsageMeter
              label="Importações neste mês"
              used={status.usage.importsThisMonth}
              max={status.limits.maxImportsPerMonth}
            />
          </div>
        </section>

        {!status.stripeConfigured && (
          <div className="rounded-xl border border-warning/30 bg-warning-subtle px-4 py-3 text-caption text-warning">
            Stripe ainda não está configurado no servidor. Os planos abaixo ficam visíveis, mas o checkout
            estará indisponível até configurar as variáveis de ambiente.
          </div>
        )}

        <section>
          <Typography variant="subtitle" className="mb-4">
            Planos disponíveis
          </Typography>
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={status.plan === plan.id}
                loading={checkout.isPending && checkout.variables === plan.id}
                onSelect={() => checkout.mutate(plan.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
