import { Link } from "react-router-dom";
import { Button, Typography } from "@/design-system/atoms";
import { Card, CardBody, CardHeader, KPIGrid } from "@/design-system/organisms";
import { ROUTES } from "@/lib/constants";
import { useSuperadminDashboard } from "../hooks";
import { formatDate } from "@/lib/format";
import { ClientStatusBadge } from "../components/client-status-badge";

export default function SuperadminDashboardPage() {
  const { data, isLoading } = useSuperadminDashboard();

  if (isLoading || !data) {
    return <Typography variant="body" tone="muted">Carregando painel...</Typography>;
  }

  const { counts, recent } = data;

  return (
    <div className="stack-gap section-gap">
      <div>
        <Typography variant="h1" as="h1">Painel SuperAdmin</Typography>
        <Typography variant="body" tone="muted" className="mt-1">
          Aprove novos clientes com um clique
        </Typography>
      </div>

      <KPIGrid
        columns={4}
        items={[
          { label: "Total de clientes", value: counts.total },
          { label: "Pendentes", value: counts.pending, highlight: counts.pending > 0 },
          { label: "Aprovados", value: counts.approved },
          { label: "Rejeitados", value: counts.rejected },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to={`${ROUTES.superadminClients}?status=pending`}>Aprovar pendentes</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={ROUTES.superadminClients}>Ver todos os clientes</Link>
        </Button>
      </div>

      <Card>
        <CardHeader title="Últimos cadastros" />
        <CardBody className="space-y-3">
          {recent.length === 0 ? (
            <Typography variant="body" tone="muted">Nenhum cadastro recente</Typography>
          ) : (
            recent.map((client) => (
              <div key={client._id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Typography variant="subtitle">{client.name}</Typography>
                  <Typography variant="caption" tone="muted">
                    {client.email} · {client.company} · {formatDate(client.createdAt)}
                  </Typography>
                </div>
                <ClientStatusBadge status={client.status} />
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
