import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { Typography } from "@/design-system/atoms";
import type { NotaStatusBreakdown } from "../api";

const STATUS_CONFIG = [
  { key: "emAberto" as const, label: "Em aberto", color: "bg-warning" },
  { key: "parcial" as const, label: "Parcial", color: "bg-info" },
  { key: "pago" as const, label: "Pago", color: "bg-success" },
];

export function NotaStatusChart({ status }: { status: NotaStatusBreakdown }) {
  const total = status.emAberto + status.parcial + status.pago;
  const hasData = total > 0;

  const chartLabel = hasData
    ? `Situação das notas: ${status.pago} pagas, ${status.parcial} parciais, ${status.emAberto} em aberto`
    : "Nenhuma nota no período";

  return (
    <Card className="h-full">
      <CardHeader title="Situação das notas" description="Distribuição por status de pagamento" />
      <CardBody>
        {!hasData ? (
          <Typography variant="body" tone="muted">
            Não há notas no período selecionado.
          </Typography>
        ) : (
          <>
            <div role="img" aria-label={chartLabel} className="stack-gap">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {STATUS_CONFIG.map((item) => {
                  const value = status[item.key];
                  const width = total > 0 ? (value / total) * 100 : 0;
                  if (width <= 0) return null;
                  return (
                    <div
                      key={item.key}
                      className={`${item.color} transition-default`}
                      style={{ width: `${width}%` }}
                      title={`${item.label}: ${value}`}
                    />
                  );
                })}
              </div>
              <ul className="space-y-3">
                {STATUS_CONFIG.map((item) => {
                  const value = status[item.key];
                  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                  return (
                    <li key={item.key} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} aria-hidden />
                        <Typography variant="body">{item.label}</Typography>
                      </span>
                      <Typography variant="subtitle" className="tabular-nums">
                        {value}{" "}
                        <Typography variant="caption" tone="muted" as="span">
                          ({pct}%)
                        </Typography>
                      </Typography>
                    </li>
                  );
                })}
              </ul>
            </div>
            <table className="sr-only">
              <caption>Situação das notas por status</caption>
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {STATUS_CONFIG.map((item) => (
                  <tr key={item.key}>
                    <td>{item.label}</td>
                    <td>{status[item.key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardBody>
    </Card>
  );
}
