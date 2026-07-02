import { Link, useParams } from "react-router-dom";
import { Button, Typography } from "@/design-system/atoms";
import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { ROUTES } from "@/lib/constants";
import { useClientAction, useSuperadminClient } from "../hooks";
import { formatDate, formatDateTime } from "@/lib/format";
import { ClientStatusBadge } from "../components/client-status-badge";
import { useToast } from "@/app/toast-provider";

export default function SuperadminClientDetailPage() {
  const { id = "" } = useParams();
  const { data, isLoading, refetch } = useSuperadminClient(id);
  const actions = useClientAction();
  const { toast } = useToast();

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

  return (
    <div className="stack-gap">
      <Button variant="outline" size="sm" asChild>
        <Link to={ROUTES.superadminClients}>← Voltar</Link>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <Typography variant="h1" as="h1">{client.name}</Typography>
        <ClientStatusBadge status={client.status} />
      </div>

      <Card>
        <CardHeader title="Dados do cliente" />
        <CardBody className="space-y-2 text-body">
          <p><strong>E-mail:</strong> {client.email}</p>
          <p><strong>Empresa:</strong> {client.company || "—"}</p>
          <p><strong>CNPJ:</strong> {client.cnpj || "—"}</p>
          <p><strong>Telefone:</strong> {client.phone || "—"}</p>
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
    </div>
  );
}
