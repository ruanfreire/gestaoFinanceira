import { Link, useSearchParams } from "react-router-dom";
import { Button, Typography } from "@/design-system/atoms";
import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { ROUTES } from "@/lib/constants";
import type { UserStatus } from "@/features/auth/types";
import { useClientAction, useSuperadminClients } from "../hooks";
import { formatDate } from "@/lib/format";
import { ClientStatusBadge } from "../components/client-status-badge";
import { useToast } from "@/app/toast-provider";

const FILTERS: { value?: UserStatus; label: string }[] = [
  { label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Rejeitados" },
  { value: "suspended", label: "Suspensos" },
];

export default function SuperadminClientsPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as UserStatus | null) || undefined;
  const { data, isLoading, refetch } = useSuperadminClients(status);
  const actions = useClientAction();
  const { toast } = useToast();

  const onApprove = async (id: string) => {
    try {
      await actions.approve.mutateAsync(id);
      toast("Cliente aprovado", "success");
      refetch();
    } catch {
      toast("Não foi possível aprovar", "error");
    }
  };

  return (
    <div className="stack-gap">
      <Typography variant="h1" as="h1">Clientes</Typography>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.label}
            type="button"
            size="sm"
            variant={status === filter.value || (!status && !filter.value) ? "primary" : "outline"}
            onClick={() => {
              if (filter.value) setParams({ status: filter.value });
              else setParams({});
            }}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader title={`${data?.total ?? 0} cliente(s)`} />
        <CardBody className="space-y-3">
          {isLoading ? (
            <Typography variant="body" tone="muted">Carregando...</Typography>
          ) : data?.items.length ? (
            data.items.map((client) => (
              <div
                key={client._id}
                className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Typography variant="subtitle">{client.name}</Typography>
                  <Typography variant="caption" tone="muted">
                    {client.email} · {client.company} · {formatDate(client.createdAt)}
                  </Typography>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ClientStatusBadge status={client.status} />
                  {client.status === "pending" && (
                    <Button size="sm" onClick={() => onApprove(client._id)} loading={actions.approve.isPending}>
                      Aprovar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`${ROUTES.superadminClients}/${client._id}`}>Detalhes</Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <Typography variant="body" tone="muted">Nenhum cliente encontrado</Typography>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
