import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api";
import type { FreteConciliacaoItem, FreteTituloCandidata } from "../types";
import { ConciliationTemplate } from "@/design-system/templates";
import { Button, Typography, Badge } from "@/design-system/atoms";
import { EmptyState, SegmentedTabs, Callout } from "@/design-system/molecules";
import { ConfirmDialog } from "@/design-system/organisms";
import { formatDate, formatMoney } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import { operacoesCopy } from "@/shared/copy/pt-BR";
import { useToast } from "@/app/toast-provider";

export default function FreteRecebimentosPage({ variant }: { variant: "pendente" | "sem_match" }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);
  const [tituloId, setTituloId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const query = useQuery({
    queryKey: ["frete-recebimentos", variant],
    queryFn: () =>
      variant === "pendente" ? documentsApi.listFretePendentes() : documentsApi.listFreteSemMatch(),
  });

  const vincular = useMutation({
    mutationFn: ({ lancamentoId, freteTituloId }: { lancamentoId: string; freteTituloId: string }) =>
      documentsApi.vincularFrete(lancamentoId, freteTituloId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["frete-recebimentos"] });
      void qc.invalidateQueries({ queryKey: ["frete-titulos"] });
      void qc.invalidateQueries({ queryKey: ["home"] });
      toast("Recebimento confirmado", "success");
      setConfirmOpen(false);
    },
    onError: (err) => toast(documentsApi.getError(err, operacoesCopy.vincularErro), "error"),
  });

  const data = query.data ?? [];
  const current: FreteConciliacaoItem | undefined = data[activeIndex];
  const selected: FreteTituloCandidata | undefined =
    current?.candidatas.find((c) => c._id === tituloId) ?? current?.candidatas[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [variant]);

  useEffect(() => {
    if (!data.length) return;
    setActiveIndex((i) => Math.min(i, data.length - 1));
  }, [data.length]);

  useEffect(() => {
    setTituloId(current?.candidatas[0]?._id ?? "");
  }, [current]);

  const onConfirm = useCallback(() => {
    if (!current || !selected) return;
    vincular.mutate({ lancamentoId: current.lancamento._id, freteTituloId: selected._id });
  }, [current, selected, vincular]);

  return (
    <ConciliationTemplate
      title={operacoesCopy.confirmarTitle}
      description={operacoesCopy.confirmarDescription}
      loading={query.isLoading}
      error={query.isError ? operacoesCopy.carregarErro : undefined}
      onRetry={() => void query.refetch()}
      tabs={
        <SegmentedTabs
          value={variant === "pendente" ? "pendentes" : "sem"}
          onChange={(id) =>
            navigate(id === "pendentes" ? ROUTES.operacoesConfirmar : ROUTES.operacoesConfirmarSem)
          }
          options={[
            { id: "pendentes", label: "Aguardando confirmação" },
            { id: "sem", label: operacoesCopy.semCorrespondencia },
          ]}
        />
      }
    >
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link to={ROUTES.documentos}>Voltar aos documentos</Link>
        </Button>
      </div>

      {!query.isLoading && data.length === 0 ? (
        <EmptyState title={operacoesCopy.emptyTitle} description={operacoesCopy.emptyDescription} />
      ) : current ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
            <Typography variant="subtitle">Pagamento bancário</Typography>
            <dl className="grid gap-2 text-small">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Data</dt>
                <dd>{formatDate(current.lancamento.data)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Pagador</dt>
                <dd>{current.lancamento.pagador_nome ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="font-medium tabular-nums">{formatMoney(current.lancamento.valor)}</dd>
              </div>
            </dl>
            <Typography variant="caption" tone="muted">
              {activeIndex + 1} de {data.length}
            </Typography>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={activeIndex >= data.length - 1}
                onClick={() => setActiveIndex((i) => Math.min(data.length - 1, i + 1))}
              >
                Próximo
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
            <Typography variant="subtitle">{operacoesCopy.candidatosTitle}</Typography>
            <ul className="space-y-2">
              {current.candidatas.map((c) => (
                <li key={c._id}>
                  <button
                    type="button"
                    onClick={() => setTituloId(c._id)}
                    className={`w-full rounded-lg border p-3 text-left transition-default ${
                      tituloId === c._id ? "border-primary bg-primary-subtle/40" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Typography variant="subtitle">Documento {c.numero ?? "—"}</Typography>
                        <Typography variant="caption" tone="muted">
                          {c.tomador_nome ?? "Destinatário não identificado"}
                        </Typography>
                      </div>
                      <Typography variant="subtitle" className="tabular-nums">
                        {formatMoney(c.valor)}
                      </Typography>
                    </div>
                    {c.match?.valueMatch && (
                      <Badge variant="success" className="mt-2">
                        Valor compatível
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <Button disabled={!selected || vincular.isPending} onClick={() => setConfirmOpen(true)}>
              Confirmar
            </Button>
          </div>
        </div>
      ) : null}

      <Callout variant="info" className="mt-6" title="Como funciona">
        {operacoesCopy.passos}
      </Callout>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={operacoesCopy.confirmDialogTitle}
        description={
          selected
            ? `Vincular pagamento de ${formatMoney(current?.lancamento.valor)} ao documento ${selected.numero ?? selected.chave_cte?.slice(-8)}.`
            : undefined
        }
        confirmLabel="Confirmar"
        loading={vincular.isPending}
        onConfirm={onConfirm}
      />
    </ConciliationTemplate>
  );
}
