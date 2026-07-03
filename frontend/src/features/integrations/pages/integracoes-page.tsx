import { motion } from "framer-motion";
import { ChevronRight, Plug } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PageHeader, PrefetchLink, ErrorState, EmptyState } from "@/design-system/molecules";
import { Badge, Skeleton, Typography } from "@/design-system/atoms";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { useIntegrationsCatalog } from "../hooks";

function statusBadge(status?: string | null) {
  if (status === "success") return <Badge variant="success">Última sync OK</Badge>;
  if (status === "failed") return <Badge variant="danger">Falhou</Badge>;
  if (status === "running") return <Badge variant="warning">Sincronizando</Badge>;
  return <Badge variant="secondary">Sem sync</Badge>;
}

export default function IntegracoesPage() {
  const { user } = useAuth();
  const catalogQuery = useIntegrationsCatalog();
  const isOwner = isTenantOwner(user);

  if (!isOwner) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Integrações"
        description="Conecte sistemas externos para importar notas e dados automaticamente"
      />

      {catalogQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : catalogQuery.isError ? (
        <ErrorState title="Não foi possível carregar integrações" onRetry={() => catalogQuery.refetch()} />
      ) : (catalogQuery.data ?? []).length === 0 ? (
        <EmptyState title="Nenhuma integração disponível" description="Novas integrações aparecerão aqui." />
      ) : (
        <div className="grid gap-3">
          {catalogQuery.data?.map((item) => (
            <PrefetchLink
              key={item.key}
              to={item.key === "honest" ? ROUTES.integracoesHonest : ROUTES.integracoes}
              className="group flex items-center gap-4 rounded-xl border border-border bg-surface/60 p-5 transition-default hover:border-primary/30 hover:bg-surface"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plug className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <Typography variant="subtitle">{item.name}</Typography>
                  {item.enabled ? (
                    <Badge variant="success">Ativa</Badge>
                  ) : (
                    <Badge variant="secondary">Inativa</Badge>
                  )}
                  {statusBadge(item.last_sync_status)}
                </span>
                <Typography variant="caption" tone="muted" className="mt-1 block">
                  {item.description}
                </Typography>
                {item.last_sync_at ? (
                  <Typography variant="caption" tone="muted" className="mt-1 block">
                    Última sincronização: {formatDateTime(item.last_sync_at)}
                  </Typography>
                ) : null}
              </span>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-muted-foreground transition-default group-hover:text-primary"
                aria-hidden
              />
            </PrefetchLink>
          ))}
        </div>
      )}
    </motion.div>
  );
}
