import { Link } from "react-router-dom";
import { Upload, FileSpreadsheet, Link2 } from "lucide-react";
import { useHomeQuery } from "../hooks";
import { DashboardTemplate } from "@/design-system/templates";
import { AttentionPanel, Card, CardBody, CardHeader, KPIGrid } from "@/design-system/organisms";
import { Button, Typography } from "@/design-system/atoms";
import { EmptyState, PeriodFilter, TaskGuide } from "@/design-system/molecules";
import { formatMoney, formatDate, bancoLabel } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import { screenTasks } from "@/lib/screen-tasks";

export default function HomePage() {
  const { data, isLoading, isError, filters, setFilters, refetch } = useHomeQuery();
  const hasAlerts = Boolean(data?.alerts.length);
  const task = screenTasks.home;

  return (
    <DashboardTemplate
      title="Início"
      description="O que precisa da sua atenção hoje"
      taskGuide={
        <TaskGuide
          goal={task.goal}
          steps={task.steps}
          minutes={task.minutes}
          currentStep={hasAlerts ? 0 : 2}
        />
      }
      loading={isLoading}
      error={isError ? "Não foi possível carregar o início." : undefined}
      onRetry={() => refetch()}
      attention={
        data ? (
          <AttentionPanel
            items={data.alerts.map((a) => ({
              id: a.id,
              title: a.title,
              message: a.message,
              link: a.link,
              linkLabel: a.linkLabel,
              type: a.type,
            }))}
          />
        ) : null
      }
      quickActions={
        !hasAlerts ? (
          <section className="stack-gap">
            <Typography variant="overline">Comece por aqui</Typography>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button variant="outline" className="h-auto justify-start py-3" asChild>
                <Link to={ROUTES.arquivosNotas}>
                  <Upload className="h-4 w-4 shrink-0" aria-hidden />
                  Enviar notas
                </Link>
              </Button>
              <Button variant="outline" className="h-auto justify-start py-3" asChild>
                <Link to={ROUTES.arquivosExtratos}>
                  <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden />
                  Enviar extrato bancário
                </Link>
              </Button>
              <Button variant="outline" className="h-auto justify-start py-3" asChild>
                <Link to={ROUTES.recebimentos}>
                  <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                  Confirmar recebimentos
                </Link>
              </Button>
            </div>
          </section>
        ) : null
      }
      filters={<PeriodFilter value={filters} onChange={setFilters} onApply={() => refetch()} />}
      kpis={
        data ? (
          <KPIGrid
            items={[
              { label: "Emitido", value: formatMoney(data.kpis.valorNf) },
              { label: "Recebido", value: formatMoney(data.kpis.valorRecebido) },
              { label: "Em aberto", value: formatMoney(data.kpis.saldoAberto), highlight: true },
            ]}
          />
        ) : null
      }
      timeline={
        data ? (
          data.recentImports.length > 0 ? (
            <Card>
              <CardHeader title="Atividade recente" />
              <CardBody className="space-y-1">
                {data.recentImports.map((item) => (
                  <Link key={item.id} to={item.link} className="block rounded-lg p-2 transition-default hover:bg-muted">
                    <Typography variant="subtitle">{item.title}</Typography>
                    <Typography variant="caption">{item.subtitle}</Typography>
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : (
            <EmptyState
              title="Nenhuma atividade recente"
              description="Importe notas ou extratos para ver o histórico aqui."
            />
          )
        ) : null
      }
    >
      {data && data.pendingMovements.length > 0 && (
        <Card>
          <CardHeader
            title="Movimentos recentes"
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link to={ROUTES.recebimentos}>Resolver agora</Link>
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {data.pendingMovements.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <Typography variant="subtitle" className="truncate">
                    {m.pagador || "Pagador não identificado"}
                  </Typography>
                  <Typography variant="caption">
                    {bancoLabel(m.source)} · {formatDate(m.data)}
                  </Typography>
                </div>
                <Typography variant="subtitle">{formatMoney(m.valor)}</Typography>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </DashboardTemplate>
  );
}
