import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Label, Typography } from "@/design-system/atoms";
import { SegmentedTabs } from "@/design-system/molecules";
import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { ROUTES } from "@/lib/constants";
import { useClientAction, useSuperadminClient } from "../hooks";
import { formatDate, formatDateTime } from "@/lib/format";
import { ClientStatusBadge } from "../components/client-status-badge";
import { PlanBadge, PLAN_LABELS } from "../components/plan-badge";
import { OrgModulesCard } from "../components/org-modules-card";
import { useToast } from "@/app/toast-provider";
import { getApiErrorMessage } from "@/lib/api-client";
import type { PlanId } from "@/features/billing/api";

const PLAN_OPTIONS: PlanId[] = ["trial", "starter", "pro"];

const BILLING_STATUS_LABELS: Record<string, string> = {
  trialing: "Em trial",
  active: "Ativo",
  past_due: "Pagamento pendente",
  canceled: "Cancelado",
  unpaid: "Não pago",
  none: "Sem assinatura",
};

export default function SuperadminClientDetailPage() {
  const { id = "" } = useParams();
  const { data, isLoading, refetch } = useSuperadminClient(id);
  const actions = useClientAction();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("trial");
  const [tab, setTab] = useState("resumo");

  const organization = data?.client.organization;
  const currentPlan = organization?.plan ?? "trial";

  useEffect(() => {
    if (organization?.plan) {
      setSelectedPlan(organization.plan);
    }
  }, [organization?.plan]);

  if (isLoading || !data) {
    return <Typography variant="body" tone="muted">Carregando cliente...</Typography>;
  }

  const { client, history } = data;

  const run = async (action: "approve" | "reject" | "suspend") => {
    try {
      if (action === "approve") await actions.approve.mutateAsync(client._id);
      if (action === "reject") await actions.reject.mutateAsync({ id: client._id });
      if (action === "suspend") await actions.suspend.mutateAsync({ id: client._id });
      toast("Status atualizado", "success");
      refetch();
    } catch {
      toast("Não foi possível atualizar", "error");
    }
  };

  const savePlan = async () => {
    if (selectedPlan === currentPlan) return;
    try {
      await actions.setPlan.mutateAsync({ id: client._id, plan: selectedPlan });
      toast("Plano atualizado", "success");
      refetch();
    } catch (error: unknown) {
      toast(getApiErrorMessage(error, "Não foi possível alterar o plano"), "error");
    }
  };

  return (
    <div className="stack-gap">
      <Button variant="outline" size="sm" asChild>
        <Link to={ROUTES.superadminClients}>← Voltar</Link>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <Typography variant="h1" as="h1">{client.name}</Typography>
        <ClientStatusBadge status={client.status} />
        <PlanBadge plan={currentPlan} />
      </div>

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { id: "resumo", label: "Resumo" },
          { id: "modulos", label: "Módulos" },
          { id: "plano", label: "Plano" },
          { id: "auditoria", label: "Auditoria" },
        ]}
      />

      {tab === "resumo" && (
        <>
      <Card>
        <CardHeader title="Dados do cliente" />
        <CardBody className="space-y-2 text-body">
          <p><strong>E-mail:</strong> {client.email}</p>
          <p><strong>Empresa:</strong> {client.company || organization?.name || "—"}</p>
          <p><strong>CNPJ:</strong> {client.cnpj || organization?.cnpj || "—"}</p>
          <p><strong>Telefone:</strong> {client.phone || "—"}</p>
          {organization?.slug && <p><strong>Slug:</strong> {organization.slug}</p>}
          <p><strong>Cadastro:</strong> {formatDateTime(client.createdAt)}</p>
          <p><strong>Último login:</strong> {formatDateTime(client.lastLogin)}</p>
          {client.lastLoginIp && <p><strong>IP:</strong> {client.lastLoginIp}</p>}
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-2">
        {client.status === "pending" && <Button onClick={() => run("approve")}>Aprovar</Button>}
        {client.status !== "rejected" && (
          <Button variant="outline" onClick={() => run("reject")}>Rejeitar</Button>
        )}
        {client.status === "approved" && (
          <Button variant="outline" onClick={() => run("suspend")}>Suspender</Button>
        )}
      </div>
        </>
      )}

      {tab === "modulos" && organization && <OrgModulesCard clientId={client._id} />}

      {tab === "plano" && (
      <Card>
        <CardHeader title="Plano da organização" />
        <CardBody className="space-y-4">
          {organization ? (
            <>
              <div className="space-y-1 text-body">
                <p>
                  <strong>Plano atual:</strong> {PLAN_LABELS[currentPlan]}
                </p>
                <p>
                  <strong>Status de cobrança:</strong>{" "}
                  {BILLING_STATUS_LABELS[organization.billingStatus ?? ""] ?? organization.billingStatus ?? "—"}
                </p>
                {organization.trialEndsAt && (
                  <p>
                    <strong>Trial até:</strong> {formatDate(organization.trialEndsAt)}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-[12rem] flex-1">
                  <Label htmlFor="client-plan">Alterar plano</Label>
                  <select
                    id="client-plan"
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
                    value={selectedPlan}
                    onChange={(event) => setSelectedPlan(event.target.value as PlanId)}
                  >
                    {PLAN_OPTIONS.map((plan) => (
                      <option key={plan} value={plan}>
                        {PLAN_LABELS[plan]}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  onClick={savePlan}
                  loading={actions.setPlan.isPending}
                  disabled={selectedPlan === currentPlan}
                >
                  Salvar plano
                </Button>
              </div>

              <Typography variant="caption" tone="muted">
                Trial concede 14 dias. Starter e Pro são ativados manualmente, sem cobrança Stripe.
              </Typography>
            </>
          ) : (
            <Typography variant="body" tone="muted">
              Este cliente não possui organização vinculada.
            </Typography>
          )}
        </CardBody>
      </Card>
      )}

      {tab === "auditoria" && (
      <Card>
        <CardHeader title="Histórico de ações" />
        <CardBody>
          {history.length === 0 ? (
            <Typography variant="body" tone="muted">Sem histórico</Typography>
          ) : (
            <ul className="space-y-2">
              {history.map((item, index) => (
                <li key={`${item.action}-${index}`} className="rounded-lg border border-border p-3">
                  <Typography variant="subtitle">{item.action}</Typography>
                  <Typography variant="caption" tone="muted">
                    {formatDateTime(item.createdAt)}
                    {item.ip ? ` · IP ${item.ip}` : ""}
                  </Typography>
                  {item.note && (
                    <Typography variant="body" tone="muted" className="mt-1">{item.note}</Typography>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
      )}
    </div>
  );
}
