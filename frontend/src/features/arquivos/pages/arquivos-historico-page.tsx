import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Upload, FileSpreadsheet } from "lucide-react";
import { arquivosApi } from "../api";
import { ListTemplate } from "@/design-system/templates";
import { Card, CardBody } from "@/design-system/organisms";
import { Badge, Button, Typography } from "@/design-system/atoms";
import { EmptyState, TaskGuide, SegmentedTabs } from "@/design-system/molecules";
import { IMPORT_STATUS_LABELS, ROUTES, queryKeys } from "@/lib/constants";
import { formatDateTime, bancoLabel } from "@/lib/format";
import { screenTasks } from "@/lib/screen-tasks";

export default function ArquivosHistoricoPage() {
  const [tab, setTab] = useState<"notas" | "extratos">("notas");
  const notasQuery = useQuery({
    queryKey: queryKeys.arquivosNotas({}),
    queryFn: () => arquivosApi.listNotas({}),
  });
  const extratosQuery = useQuery({
    queryKey: queryKeys.arquivosExtratos({}),
    queryFn: () => arquivosApi.listExtratos({}),
  });
  const task = screenTasks.arquivosHistorico;
  const activeQuery = tab === "notas" ? notasQuery : extratosQuery;
  const items = tab === "notas" ? notasQuery.data?.items : extratosQuery.data?.items;

  return (
    <ListTemplate
      title="Histórico de importações"
      description="Consulte importações anteriores de notas e extratos"
      taskGuide={
        <TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} currentStep={0} />
      }
      loading={activeQuery.isLoading}
      error={activeQuery.isError ? "Não foi possível carregar o histórico." : undefined}
      onRetry={() => activeQuery.refetch()}
    >
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { id: "notas", label: "Notas (JSON)" },
          { id: "extratos", label: "Extratos (CSV)" },
        ]}
      />

      {!activeQuery.isLoading && !activeQuery.isError && (!items || items.length === 0) && (
        <div className="stack-gap items-center text-center">
          <EmptyState
            title={tab === "notas" ? "Nenhuma importação de notas" : "Nenhuma importação de extratos"}
            description="Faça sua primeira importação — leva poucos minutos."
          />
          <Button asChild>
            <Link to={tab === "notas" ? ROUTES.arquivosNotas : ROUTES.arquivosExtratos}>
              {tab === "notas" ? (
                <Upload className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {tab === "notas" ? "Enviar notas" : "Enviar extrato bancário"}
            </Link>
          </Button>
        </div>
      )}

      <div className="stack-gap">
        {tab === "notas" &&
          notasQuery.data?.items.map((item) => (
            <Link key={item._id} to={`/arquivos/historico/notas/${item._id}`}>
              <Card hover>
                <CardBody className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Typography variant="subtitle" className="truncate">
                      {item.label || item.originalName || item.filename}
                    </Typography>
                    <Typography variant="caption">{formatDateTime(item.createdAt)}</Typography>
                  </div>
                  <Badge variant={item.status === "failed" ? "danger" : item.status === "finished" ? "success" : "secondary"}>
                    {IMPORT_STATUS_LABELS[item.status ?? ""] ?? item.status}
                  </Badge>
                </CardBody>
              </Card>
            </Link>
          ))}

        {tab === "extratos" &&
          extratosQuery.data?.items.map((item) => (
            <Link key={`${item.banco}-${item._id}`} to={`/arquivos/historico/extratos/${item.banco}/${item._id}`}>
              <Card hover>
                <CardBody className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Typography variant="subtitle" className="truncate">
                      {item.label || item.originalName || item.filename}
                    </Typography>
                    <Typography variant="caption">
                      {bancoLabel(item.banco)} · {formatDateTime(item.createdAt)}
                    </Typography>
                  </div>
                  <Badge variant={item.status === "failed" ? "danger" : "success"}>
                    {IMPORT_STATUS_LABELS[item.status ?? ""] ?? item.status}
                  </Badge>
                </CardBody>
              </Card>
            </Link>
          ))}
      </div>
    </ListTemplate>
  );
}
