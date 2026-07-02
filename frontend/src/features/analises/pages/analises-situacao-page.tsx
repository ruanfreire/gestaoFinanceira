import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analisesApi, buildExtracaoCsvFilename } from "../api";
import { exportExtracaoCsv } from "../export";
import { ReportTemplate } from "@/design-system/templates";
import { PeriodFilter, defaultPeriodFilter, validatePeriodFilter, TaskGuide, EmptyState } from "@/design-system/molecules";
import { KPIGrid } from "@/design-system/organisms";
import { Button, Badge, Skeleton } from "@/design-system/atoms";
import { Card, CardBody } from "@/design-system/organisms";
import { Typography } from "@/design-system/atoms";
import { formatMoney } from "@/lib/format";
import { PAYMENT_STATUS_LABELS, queryKeys } from "@/lib/constants";
import { useToast } from "@/app/toast-provider";
import { screenTasks } from "@/lib/screen-tasks";

export default function AnalisesSituacaoPage() {
  const [filters, setFilters] = useState(defaultPeriodFilter);
  const [status, setStatus] = useState("all");
  const [applied, setApplied] = useState<typeof filters | null>(null);
  const { toast } = useToast();
  const task = screenTasks.analisesSituacao;

  const query = useQuery({
    queryKey: queryKeys.analisesExtracao({ ...applied, statusPagamento: status }),
    queryFn: () =>
      analisesApi.getExtracao({
        ...applied!,
        statusPagamento: status === "all" ? undefined : status,
        dateBasis: "pagamento",
      }),
    enabled: Boolean(applied),
  });

  const apply = () => {
    const err = validatePeriodFilter(filters);
    if (err) {
      toast(err, "error");
      return;
    }
    setApplied({ ...filters });
  };

  useEffect(() => {
    const err = validatePeriodFilter(filters);
    if (!err && !applied) {
      setApplied({ ...filters });
    }
  }, [applied, filters]);

  return (
    <ReportTemplate
      title="Situação das notas"
      description="Resumo do período — já carregado com o mês atual"
      loading={query.isLoading && Boolean(applied)}
      error={query.isError ? "Não foi possível carregar o resumo." : undefined}
      onRetry={() => query.refetch()}
      taskGuide={
        <TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} currentStep={applied ? 1 : 0} />
      }
      filters={
        <div className="stack-gap">
          <PeriodFilter value={filters} onChange={setFilters} onApply={apply} loading={query.isFetching} />
          <div>
            <Typography variant="small" className="mb-2 font-medium">
              Filtrar por status
            </Typography>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "Todos" },
                { value: "em_aberto", label: "Em aberto" },
                { value: "parcial", label: "Parcial" },
                { value: "pago", label: "Pago" },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={status === opt.value ? "primary" : "outline"}
                  onClick={() => setStatus(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      }
      summary={
        query.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : query.data ? (
          <KPIGrid
            items={[
              { label: "Total NF", value: formatMoney(query.data.totais.valor_nf) },
              { label: "Pago", value: formatMoney(query.data.totais.valor_pago) },
              { label: "Em aberto", value: formatMoney(query.data.totais.saldo_aberto), highlight: true },
            ]}
          />
        ) : undefined
      }
      preview={
        query.data ? (
          <div className="stack-gap">
            {query.data.items.length === 0 ? (
              <EmptyState
                title="Nenhuma nota neste período"
                description="Ajuste as datas ou o filtro de status acima."
              />
            ) : (
              query.data.items.slice(0, 50).map((n) => (
                <Card key={n._id}>
                  <CardBody className="flex items-center justify-between gap-2">
                    <div>
                      <Typography variant="subtitle">NF {n.numero}</Typography>
                      <Typography variant="caption">{n.tomador}</Typography>
                    </div>
                    <div className="text-right">
                      <Typography variant="subtitle">{formatMoney(n.valor)}</Typography>
                      <Badge variant={n.status_pagamento === "pago" ? "success" : "warning"}>
                        {PAYMENT_STATUS_LABELS[n.status_pagamento ?? ""] ?? n.status_pagamento}
                      </Badge>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        ) : undefined
      }
      exportAction={
        query.data && applied ? (
          <Button
            onClick={() => {
              exportExtracaoCsv(
                query.data!.items,
                buildExtracaoCsvFilename({
                  ...applied,
                  statusPagamento: status === "all" ? undefined : status,
                }),
              );
              toast("CSV exportado", "success");
            }}
          >
            Exportar CSV
          </Button>
        ) : undefined
      }
    />
  );
}
