import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button, Typography } from "@/design-system/atoms";
import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { EmptyState } from "@/design-system/molecules";
import { formatMoney, formatDate, bancoLabel } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import type { PendingMovement } from "../api";

function resolveLink(movement: PendingMovement): string {
  return movement.variant === "sem_match" ? ROUTES.recebimentosSem : ROUTES.recebimentos;
}

function movementLabel(movement: PendingMovement): string {
  if (movement.variant === "sem_match") return "Pagamento sem nota correspondente";
  if (movement.candidatasCount > 0) {
    return `${movement.candidatasCount} sugestão(ões) de nota`;
  }
  return "Aguardando confirmação";
}

export function PendingTasksList({ items }: { items: PendingMovement[] }) {
  if (items.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader title="Pendências" description="Itens que precisam da sua ação" />
        <CardBody>
          <EmptyState
            title="Nenhuma pendência"
            description="Tudo em dia no período selecionado. Você pode importar novos dados ou revisar as análises."
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader
        title="Pendências"
        description="Pagamentos e importações que precisam de atenção"
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link to={ROUTES.recebimentos}>Ver todas</Link>
          </Button>
        }
      />
      <CardBody className="divide-y divide-border p-0">
        {items.map((movement) => (
          <div
            key={movement.id}
            className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div className="min-w-0">
              <Typography variant="subtitle" className="truncate">
                {movement.pagador || "Pagador não identificado"}
              </Typography>
              <Typography variant="caption" tone="muted">
                {bancoLabel(movement.source)} · {formatDate(movement.data)} · {movementLabel(movement)}
              </Typography>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Typography variant="subtitle" className="tabular-nums">
                {formatMoney(movement.valor)}
              </Typography>
              <Button size="sm" className="w-full sm:w-auto" asChild>
                <Link to={resolveLink(movement)}>
                  Resolver
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
