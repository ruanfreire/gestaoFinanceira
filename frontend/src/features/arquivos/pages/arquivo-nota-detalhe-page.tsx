import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { arquivosApi } from "../api";
import { ListTemplate } from "@/design-system/templates";
import { Card, CardBody } from "@/design-system/organisms";
import { Button } from "@/design-system/atoms";
import { StatisticCard, TaskGuide } from "@/design-system/molecules";
import { queryKeys, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export default function ArquivoNotaDetalhePage() {
  const { id = "" } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.arquivosNota(id),
    queryFn: () => arquivosApi.getNota(id),
    enabled: Boolean(id),
  });

  return (
    <ListTemplate
      title={data?.label || data?.originalName || "Importação de notas"}
      description={data?.createdAt ? formatDateTime(data.createdAt) : "Detalhe da importação"}
      loading={isLoading}
      error={isError ? "Não foi possível carregar esta importação." : undefined}
      onRetry={() => refetch()}
      taskGuide={
        <TaskGuide
          goal="Conferir o resultado desta importação"
          steps={["Veja quantas notas entraram", "Baixe o JSON se precisar", "Volte ao histórico quando terminar"]}
          minutes={1}
          currentStep={0}
        />
      }
      actions={
        <Button variant="outline" onClick={() => arquivosApi.downloadJson(id, `importacao-${id}.json`)}>
          Baixar JSON
        </Button>
      }
    >
      <Card>
        <CardBody className="stack-gap">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatisticCard label="Importadas" value={data?.stats?.imported ?? 0} />
            <StatisticCard label="Atualizadas" value={data?.stats?.updated ?? 0} />
            <StatisticCard label="Ignoradas" value={data?.stats?.ignored ?? 0} />
            <StatisticCard label="Total de notas" value={data?.stats?.total_faturas ?? 0} />
          </div>
          <Button variant="outline" asChild>
            <Link to={ROUTES.arquivosHistorico}>Voltar ao histórico</Link>
          </Button>
        </CardBody>
      </Card>
    </ListTemplate>
  );
}
