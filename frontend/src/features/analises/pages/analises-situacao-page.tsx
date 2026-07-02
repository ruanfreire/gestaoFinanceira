import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { analisesApi, buildExtracaoCsvFilename } from "../api";
import { exportExtracaoCsv } from "../export";
import { SituacaoNotasTable } from "../components/situacao-notas-table";
import { ReportTemplate } from "@/design-system/templates";
import {
  CompactPeriodToolbar,
  defaultPeriodFilter,
  validatePeriodFilter,
  EmptyState,
  SegmentedTabs,
} from "@/design-system/molecules";
import { KPIGrid, Card, CardBody } from "@/design-system/organisms";
import { Button, Badge, Typography } from "@/design-system/atoms";
import { formatMoney } from "@/lib/format";
import { PAYMENT_STATUS_LABELS, queryKeys } from "@/lib/constants";
import { useToast } from "@/app/toast-provider";

const PREVIEW_LIMIT = 5;

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Typography variant="caption" tone="muted" className="font-medium">
        {label}
      </Typography>
      {children}
    </div>
  );
}

export default function AnalisesSituacaoPage() {
  const [filters, setFilters] = useState(defaultPeriodFilter);
  const [status, setStatus] = useState("all");
  const [dateBasis, setDateBasis] = useState<"pagamento" | "emissao">("pagamento");
  const [showAll, setShowAll] = useState(false);
  const [applied, setApplied] = useState<typeof filters | null>(null);
  const { toast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.analisesExtracao({ ...applied, statusPagamento: status, dateBasis }),
    queryFn: () =>
      analisesApi.getExtracao({
        ...applied!,
        statusPagamento: status === "all" ? undefined : status,
        dateBasis,
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
    setShowAll(false);
  };

  useEffect(() => {
    const err = validatePeriodFilter(filters);
    if (!err && !applied) {
      setApplied({ ...filters });
    }
  }, [applied, filters]);

  useEffect(() => {
    setShowAll(false);
  }, [status, dateBasis, applied]);

  const handleExport = () => {
    if (!query.data || !applied) return;
    exportExtracaoCsv(
      query.data.items,
      buildExtracaoCsvFilename({
        ...applied,
        statusPagamento: status === "all" ? undefined : status,
        dateBasis,
      }),
    );
    toast("Arquivo salvo na pasta de downloads.", "success");
  };

  return (
    <ReportTemplate
      title="Situação das notas"
      description="Emitido, recebido e em aberto no período selecionado"
      loading={query.isLoading && Boolean(applied)}
      error={query.isError ? "Não foi possível carregar o resumo." : undefined}
      onRetry={() => query.refetch()}
      exportAction={
        query.data && applied ? (
          <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            Exportar CSV
          </Button>
        ) : undefined
      }
      filters={
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <CompactPeriodToolbar value={filters} onChange={setFilters} idPrefix="situacao" />
            <Button type="button" size="sm" className="h-9 w-full sm:w-auto" onClick={apply} loading={query.isFetching}>
              Atualizar
            </Button>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-8">
            <FilterField label="Data de referência">
              <SegmentedTabs
                variant="compact"
                value={dateBasis}
                onChange={(id) => setDateBasis(id as "pagamento" | "emissao")}
                options={[
                  { id: "pagamento", label: "Pagamento" },
                  { id: "emissao", label: "Emissão" },
                ]}
              />
            </FilterField>
            <FilterField label="Status do pagamento">
              <SegmentedTabs
                variant="compact"
                value={status}
                onChange={setStatus}
                options={[
                  { id: "all", label: "Todos" },
                  { id: "em_aberto", label: "Em aberto" },
                  { id: "parcial", label: "Parcial" },
                  { id: "pago", label: "Pago" },
                ]}
              />
            </FilterField>
          </div>
        </div>
      }
      summary={
        query.data ? (
          <KPIGrid
            columns={3}
            items={[
              { label: "Total emitido", value: formatMoney(query.data.totais.valor_nf) },
              { label: "Recebido", value: formatMoney(query.data.totais.valor_pago) },
              {
                label: "Em aberto",
                value: formatMoney(query.data.totais.saldo_aberto),
                highlight: query.data.totais.saldo_aberto > 0,
              },
            ]}
          />
        ) : undefined
      }
      preview={
        query.data ? (
          <div className="space-y-4">
            {query.data.items.length === 0 ? (
              <Card>
                <CardBody>
                  <EmptyState
                    title="Nenhuma nota neste período"
                    description="Ajuste o período ou os filtros acima."
                  />
                </CardBody>
              </Card>
            ) : showAll ? (
              <SituacaoNotasTable items={query.data.items} />
            ) : (
              <>
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {query.data.items.slice(0, PREVIEW_LIMIT).map((n) => (
                    <div
                      key={n._id}
                      className="flex items-center justify-between gap-3 bg-surface px-4 py-3 sm:px-5"
                    >
                      <div className="min-w-0">
                        <Typography variant="subtitle">NF {n.numero}</Typography>
                        <Typography variant="caption" tone="muted" className="truncate">
                          {n.tomador}
                        </Typography>
                      </div>
                      <div className="shrink-0 text-right">
                        <Typography variant="subtitle" className="tabular-nums">
                          {formatMoney(n.valor)}
                        </Typography>
                        <Badge variant={n.status_pagamento === "pago" ? "success" : "warning"} className="mt-1">
                          {PAYMENT_STATUS_LABELS[n.status_pagamento ?? ""] ?? n.status_pagamento}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {query.data.items.length > PREVIEW_LIMIT && (
                  <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
                    Ver todas ({query.data.total} notas)
                  </Button>
                )}
              </>
            )}
            {showAll && query.data.items.length > PREVIEW_LIMIT && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(false)}>
                Mostrar menos
              </Button>
            )}
          </div>
        ) : undefined
      }
    />
  );
}
