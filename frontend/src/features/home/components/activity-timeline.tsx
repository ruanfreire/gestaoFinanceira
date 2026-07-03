import { PrefetchLink } from "@/design-system/molecules";
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge, Typography } from "@/design-system/atoms";
import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { EmptyState } from "@/design-system/molecules";
import { formatDateTime } from "@/lib/format";
import { IMPORT_STATUS_LABELS } from "@/lib/constants";
import type { RecentImport } from "../api";

function statusVariant(status?: string): "success" | "danger" | "warning" | "neutral" {
  if (status === "finished") return "success";
  if (status === "failed") return "danger";
  if (status === "processing" || status === "pending") return "warning";
  return "neutral";
}

function ImportIcon({ kind }: { kind: RecentImport["kind"] }) {
  const Icon = kind === "fatura" ? Upload : FileSpreadsheet;
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
}

export function RecentImportsList({ items }: { items: RecentImport[] }) {
  const visible = items.slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader
        title="Últimas importações"
        description="Lotes recentes de notas e extratos"
        actions={
          <PrefetchLink to="/arquivos/historico" className="text-small font-medium text-primary hover:underline">
            Histórico
          </PrefetchLink>
        }
      />
      <CardBody>
        {visible.length === 0 ? (
          <EmptyState
            title="Nenhuma importação"
            description="Envie notas ou extratos para começar."
          />
        ) : (
          <ul className="space-y-2">
            {visible.map((item) => (
              <li key={item.id}>
                <PrefetchLink
                  to={item.link}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 transition-default hover:bg-muted/50"
                >
                  <ImportIcon kind={item.kind} />
                  <div className="min-w-0 flex-1">
                    <Typography variant="subtitle" className="truncate">
                      {item.title}
                    </Typography>
                    <Typography variant="caption" tone="muted">
                      {item.subtitle}
                    </Typography>
                  </div>
                  {item.status && (
                    <Badge variant={statusVariant(item.status)}>
                      {IMPORT_STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                  )}
                </PrefetchLink>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  link: string;
  kind: "import" | "error" | "success";
  createdAt?: string;
};

function buildActivities(imports: RecentImport[]): ActivityItem[] {
  return imports.slice(0, 8).map((item) => ({
    id: item.id,
    title: item.kind === "fatura" ? "Importação de notas" : "Importação de extrato",
    subtitle: `${item.title} · ${item.subtitle}`,
    link: item.link,
    kind: item.status === "failed" ? "error" : item.status === "finished" ? "success" : "import",
    createdAt: item.createdAt,
  }));
}

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  if (kind === "error") return <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden />;
  if (kind === "success") return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />;
  return <Upload className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
}

export function ActivityTimeline({ imports }: { imports: RecentImport[] }) {
  const activities = buildActivities(imports);

  return (
    <Card>
      <CardHeader title="Atividade recente" description="Últimas ações no sistema" />
      <CardBody>
        {activities.length === 0 ? (
          <EmptyState
            title="Nenhuma atividade recente"
            description="Importe notas ou extratos para ver o histórico aqui."
          />
        ) : (
          <ol className="relative space-y-0 border-l border-border pl-6">
            {activities.map((activity, index) => (
              <li key={activity.id} className="relative pb-6 last:pb-0">
                <span
                  className="absolute -left-[1.625rem] top-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface"
                  aria-hidden
                >
                  <ActivityIcon kind={activity.kind} />
                </span>
                <PrefetchLink to={activity.link} className="block rounded-lg transition-default hover:bg-muted/50 p-2 -ml-2">
                  <Typography variant="subtitle">{activity.title}</Typography>
                  <Typography variant="caption" tone="muted">
                    {formatDateTime(activity.createdAt)}
                    {index === 0 ? " · mais recente" : ""}
                  </Typography>
                  <Typography variant="body" tone="muted" className="mt-0.5">
                    {activity.subtitle}
                  </Typography>
                </PrefetchLink>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
