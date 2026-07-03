import { useNavigate, useParams } from "react-router-dom";
import { PrefetchLink } from "@/design-system/molecules";
import { useOrgPath } from "@/features/org/org-slug-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { arquivosApi } from "../api";
import type { BancoExtrato } from "../types";
import { ListTemplate } from "@/design-system/templates";
import { Card, CardBody, ConfirmDialog } from "@/design-system/organisms";
import { Button, Typography } from "@/design-system/atoms";
import { EmptyState, StatisticCard, TaskGuide } from "@/design-system/molecules";
import { queryKeys, CONCILIACAO_STATUS_LABELS, ROUTES } from "@/lib/constants";
import { formatDateTime, bancoLabel } from "@/lib/format";
import { useToast } from "@/app/toast-provider";
import { useState } from "react";

export default function ArquivoExtratoDetalhePage() {
  const { id = "" } = useParams<{ banco?: string; id: string }>();
  const banco: BancoExtrato = "bank";
  const navigate = useNavigate();
  const orgPath = useOrgPath();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.arquivosExtrato(banco, id),
    queryFn: () => arquivosApi.getExtrato(banco, id),
    enabled: Boolean(id),
  });
  const lancamentos = useQuery({
    queryKey: queryKeys.arquivosLancamentos(banco, id, {}),
    queryFn: () => arquivosApi.listLancamentos(banco, id, {}),
    enabled: Boolean(id),
  });

  const pending = data?.stats?.pendente_vinculo ?? 0;
  const lancamentoItems =
    (lancamentos.data?.items as { descricao?: string; status_conciliacao?: string }[]) ?? [];

  const deleteMutation = useMutation({
    mutationFn: () => arquivosApi.deleteExtrato(banco, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arquivos"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["recebimentos"] });
      toast("Importação excluída", "success");
      navigate(orgPath(ROUTES.arquivosHistorico));
    },
    onError: (err) => {
      toast(arquivosApi.getError(err, "Não foi possível excluir a importação"), "error");
    },
  });

  return (
    <ListTemplate
      title={data?.label || data?.originalName || `Extrato ${bancoLabel(banco, data?.banco_label)}`}
      description={data?.createdAt ? formatDateTime(data.createdAt) : "Detalhe da importação"}
      loading={isLoading}
      error={
        isError
          ? "Não foi possível carregar este extrato. Ele pode ter sido excluído ou removido em um reset do banco."
          : undefined
      }
      onRetry={() => refetch()}
      taskGuide={
        <TaskGuide
          goal="Conferir o resultado desta importação de extrato"
          steps={[
            "Veja quantos pagamentos foram associados automaticamente",
            pending > 0 ? `Confirme os ${pending} que precisam da sua atenção` : "Baixe o CSV se precisar",
            "Volte ao histórico quando terminar",
          ]}
          minutes={1}
          currentStep={0}
        />
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => arquivosApi.downloadCsv(banco, id, `extrato-${id}.csv`)}>
            Baixar CSV
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Excluir importação
          </Button>
        </div>
      }
    >
      <Card>
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatisticCard label="Automáticos" value={data?.stats?.conciliado_auto ?? 0} />
            <StatisticCard label="Precisa de confirmação" value={data?.stats?.pendente_vinculo ?? 0} />
            <StatisticCard label="Sem nota" value={data?.stats?.sem_match ?? 0} />
            <StatisticCard label="Linhas" value={data?.stats?.total_linhas ?? data?.stats?.imported ?? 0} />
          </div>
        </CardBody>
      </Card>

      {pending > 0 && (
        <Button asChild className="w-full sm:w-auto">
          <PrefetchLink to={ROUTES.recebimentos}>Confirmar {pending} pagamento(s)</PrefetchLink>
        </Button>
      )}

      {lancamentos.isError && (
        <Typography variant="body" tone="muted">
          Não foi possível carregar a lista de lançamentos.
        </Typography>
      )}

      {lancamentoItems.length === 0 && !lancamentos.isLoading && !lancamentos.isError ? (
        <EmptyState title="Nenhum lançamento" description="Este extrato não possui movimentos listados." />
      ) : (
        <div className="stack-gap">
          {lancamentoItems.slice(0, 10).map((l, i) => (
            <Card key={i}>
              <CardBody className="flex items-center justify-between gap-2">
                <Typography variant="small" className="truncate">
                  {l.descricao || "—"}
                </Typography>
                <Typography variant="caption" className="shrink-0">
                  {CONCILIACAO_STATUS_LABELS[l.status_conciliacao ?? ""] ?? l.status_conciliacao}
                </Typography>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Button variant="outline" asChild>
        <PrefetchLink to={ROUTES.arquivosHistorico}>Voltar ao histórico</PrefetchLink>
      </Button>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir importação?"
        description="Os lançamentos deste extrato serão removidos. Você poderá enviar o mesmo arquivo de novo depois."
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </ListTemplate>
  );
}
