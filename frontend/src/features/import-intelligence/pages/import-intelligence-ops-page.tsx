import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { PageHeader, ErrorState } from "@/design-system/molecules";
import { Card, CardBody } from "@/design-system/organisms";
import { Button, Skeleton, Typography } from "@/design-system/atoms";
import { importIntelligenceApi } from "../api";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/format";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      <Typography variant="subtitle" className="mt-1 tabular-nums">
        {value}
      </Typography>
    </div>
  );
}

export default function ImportIntelligenceOpsPage() {
  const { user } = useAuth();

  if (!isTenantOwner(user)) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const opsQuery = useQuery({
    queryKey: ["import-intelligence", "ops"],
    queryFn: () => importIntelligenceApi.getOps(),
  });

  const data = opsQuery.data;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Importação inteligente"
        description="Métricas de qualidade, uso de IA e sessões recentes de análise"
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.configuracoes}>Voltar</Link>
          </Button>
        }
      />

      {opsQuery.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {opsQuery.isError && (
        <ErrorState message={importIntelligenceApi.getError(opsQuery.error, "Falha ao carregar métricas")} />
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Importações bancárias" value={data.metrics.imports_total} />
            <Stat
              label="Taxa prévia = importação"
              value={`${Math.round(data.metrics.preview_vs_import_match_rate * 100)}%`}
            />
            <Stat
              label="Sugestões aceitas sem editar"
              value={`${Math.round(data.metrics.suggestion_accepted_rate * 100)}%`}
            />
            <Stat label="Perfis ativos" value={data.metrics.profiles_active} />
          </div>

          <Card>
            <CardBody className="stack-gap">
              <Typography variant="subtitle">Uso de IA (30 dias)</Typography>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Chamadas hoje" value={`${data.gemini.today_calls} / ${data.gemini.daily_limit}`} />
                <Stat label="Restantes hoje" value={data.gemini.remaining_today} />
                <Stat label="Sucesso / falha" value={`${data.gemini.success_calls} / ${data.gemini.failed_calls}`} />
                <Stat label="Latência média" value={`${data.gemini.avg_latency_ms} ms`} />
              </div>
              <Typography variant="caption" tone="muted">
                Tokens estimados (30d): {data.gemini.estimated_tokens_30d.toLocaleString("pt-BR")}
              </Typography>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="stack-gap">
              <Typography variant="subtitle">Sessões recentes</Typography>
              {data.sessions.items.length === 0 ? (
                <Typography variant="body" tone="muted">
                  Nenhuma análise registrada ainda.
                </Typography>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {data.sessions.items.map((session) => (
                    <div key={session._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <span className="font-medium">{session.file_name}</span>
                      <span className="text-muted-foreground">
                        {session.file_kind} · {session.outcome}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </motion.div>
  );
}
