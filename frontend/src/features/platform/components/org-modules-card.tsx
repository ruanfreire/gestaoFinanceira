import { Badge, Typography } from "@/design-system/atoms";
import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { useToast } from "@/app/toast-provider";
import { getApiErrorMessage } from "@/lib/api-client";
import { useClientAction, useSuperadminClientModules } from "../hooks";
import type { ModuleCatalogItem } from "../api";

const STATUS_LABELS: Record<ModuleCatalogItem["status"], string> = {
  production: "Produção",
  beta: "Beta",
  disabled: "Indisponível",
};

const STATUS_VARIANT: Record<ModuleCatalogItem["status"], "success" | "warning" | "neutral"> = {
  production: "success",
  beta: "warning",
  disabled: "neutral",
};

export function OrgModulesCard({ clientId }: { clientId: string }) {
  const { data, isLoading, refetch } = useSuperadminClientModules(clientId);
  const actions = useClientAction();
  const { toast } = useToast();

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader title="Módulos da organização" />
        <CardBody>
          <Typography variant="body" tone="muted">Carregando módulos...</Typography>
        </CardBody>
      </Card>
    );
  }

  const toggle = async (item: ModuleCatalogItem) => {
    if (item.key === "finance") return;
    if (item.status === "disabled") return;

    try {
      await actions.toggleModule.mutateAsync({
        id: clientId,
        key: item.key,
        enabled: !item.enabled,
      });
      toast(item.enabled ? "Módulo desativado" : "Módulo ativado", "success");
      refetch();
    } catch (error: unknown) {
      toast(getApiErrorMessage(error, "Não foi possível alterar o módulo"), "error");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Módulos da organização"
        description="Libere produtos e features por cliente. Módulos beta só devem ser ativados para pilotos."
      />
      <CardBody className="space-y-3">
        {data.catalog.map((item) => {
          const locked = item.key === "finance" || item.status === "disabled";
          const dependencyHint =
            item.requires?.length && !item.enabled
              ? `Requer: ${item.requires.join(", ")}`
              : null;

          return (
            <div
              key={item.key}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Typography variant="subtitle">{item.name}</Typography>
                  <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                  {item.killSwitchActive && <Badge variant="danger">Kill switch</Badge>}
                </div>
                <Typography variant="body" tone="muted">{item.description}</Typography>
                {dependencyHint && (
                  <Typography variant="caption" tone="muted">{dependencyHint}</Typography>
                )}
              </div>

              <label className="flex shrink-0 items-center gap-2 text-body">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={item.enabled}
                  disabled={locked || actions.toggleModule.isPending || item.killSwitchActive}
                  onChange={() => void toggle(item)}
                />
                <span>{item.enabled ? "Ativo" : "Inativo"}</span>
              </label>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
