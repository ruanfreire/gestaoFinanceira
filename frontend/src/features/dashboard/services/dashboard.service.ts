import api from "@/shared/services/api.client";
import { formatCompetencia } from "@/utils/nota-format.util";
import { paymentDateApiParams } from "@/features/relatorios/services/relatorios.service";
import type {
  ConciliacaoListResponse,
  DashboardAlert,
  DashboardData,
  DashboardFilters,
  ExtracaoResponse,
  ImportacaoBancaria,
  ImportacaoFatura,
  NotaExtracaoItem,
  PaginatedResponse,
  PendingMovement,
  RecentImport,
} from "../types/dashboard.types";
import { isDateInDashboardPeriod } from "../utils/dashboard-period.util";

function filterConciliacaoResponse(
  response: ConciliacaoListResponse,
  filters: DashboardFilters,
): ConciliacaoListResponse {
  const items = response.items.filter((item) =>
    isDateInDashboardPeriod(item.lancamento.data, filters),
  );
  return { items, total: items.length };
}

function filterRecentImports(items: RecentImport[], filters: DashboardFilters): RecentImport[] {
  return items.filter((item) => isDateInDashboardPeriod(item.createdAt, filters));
}

function paymentMonthKey(value: string | Date): string {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function buildPaymentMonthChart(items: NotaExtracaoItem[]) {
  const map = new Map<string, { emitido: number; recebido: number }>();

  for (const item of items) {
    const pagamentos =
      item.pagamentos && item.pagamentos.length > 0
        ? item.pagamentos
        : item.data_pagamento
          ? [{ data: item.data_pagamento, valor: item.valor_pago_efetivo ?? item.valor_pago ?? 0 }]
          : [];

    for (const pagamento of pagamentos) {
      if (!pagamento.data) continue;
      const key = paymentMonthKey(pagamento.data);
      const current = map.get(key) ?? { emitido: 0, recebido: 0 };
      current.emitido += Number(item.valor ?? 0);
      current.recebido += Number(pagamento.valor ?? 0);
      map.set(key, current);
    }
  }

  const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);

  return {
    categories: sorted.map(([key]) => formatCompetencia(key)),
    emitido: sorted.map(([, values]) => values.emitido),
    recebido: sorted.map(([, values]) => values.recebido),
  };
}

function countNotasByStatus(items: NotaExtracaoItem[]) {
  let pagas = 0;
  let emAberto = 0;

  for (const item of items) {
    if (item.status_pagamento === "pago" || (item.saldo_aberto ?? 0) <= 0) {
      pagas += 1;
    } else {
      emAberto += 1;
    }
  }

  return { pagas, emAberto };
}

function mergeRecentImports(
  faturas: ImportacaoFatura[],
  extratos: ImportacaoBancaria[],
): RecentImport[] {
  const faturaItems: RecentImport[] = faturas.map((item) => ({
    id: item._id,
    kind: "fatura",
    title: item.label || item.originalName || item.filename || "Importação de faturas",
    subtitle: `${item.stats?.imported ?? 0} nota(s) importada(s)`,
    status: item.status,
    createdAt: item.createdAt,
    link: `/importacoes/historico/${item._id}`,
  }));

  const extratoItems: RecentImport[] = extratos.map((item) => {
    const banco = item.banco === "nubank" ? "Nubank" : "Asaas";
    const movimentos =
      item.stats?.imported ??
      item.stats?.total_linhas ??
      item.stats?.cobrancas ??
      item.stats?.creditos ??
      0;

    return {
      id: `${item.banco}-${item._id}`,
      kind: "extrato",
      title: item.label || item.originalName || item.filename || `Extrato ${banco}`,
      subtitle: `${movimentos} movimento(s) · ${banco}`,
      status: item.status,
      createdAt: item.createdAt,
      link: `/importacoes-bancarias/historico/${item.banco}/${item._id}`,
    };
  });

  return [...faturaItems, ...extratoItems]
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 8);
}

function mergePendingMovements(
  pendentesAsaas: ConciliacaoListResponse,
  pendentesNubank: ConciliacaoListResponse,
  semMatchAsaas: ConciliacaoListResponse,
  semMatchNubank: ConciliacaoListResponse,
): PendingMovement[] {
  const mapItem = (
    item: ConciliacaoListResponse["items"][number],
    source: "asaas" | "nubank",
    variant: "pendente" | "sem_match",
  ): PendingMovement => ({
    id: `${source}-${variant}-${item.lancamento._id}`,
    source,
    pagador: item.lancamento.pagador_nome,
    valor: item.lancamento.valor,
    data: item.lancamento.data,
    candidatasCount: item.candidatas.length,
    variant,
  });

  const all = [
    ...pendentesAsaas.items.map((item) => mapItem(item, "asaas", "pendente")),
    ...pendentesNubank.items.map((item) => mapItem(item, "nubank", "pendente")),
    ...semMatchAsaas.items.map((item) => mapItem(item, "asaas", "sem_match")),
    ...semMatchNubank.items.map((item) => mapItem(item, "nubank", "sem_match")),
  ];

  return all
    .sort((a, b) => {
      const ta = a.data ? new Date(a.data).getTime() : 0;
      const tb = b.data ? new Date(b.data).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 6);
}

function buildAlerts(
  kpis: DashboardData["kpis"],
  recentImports: RecentImport[],
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (kpis.semMatch > 0) {
    alerts.push({
      id: "sem-match",
      type: "warning",
      title: "Lançamentos sem correspondência",
      message: `${kpis.semMatch} lançamento(s) aguardam análise manual.`,
      link: "/conciliacao/sem-match",
      linkLabel: "Ver sem match",
    });
  }

  if (kpis.pendentesConciliacao > 0) {
    alerts.push({
      id: "pendentes",
      type: "info",
      title: "Conciliações pendentes",
      message: `${kpis.pendentesConciliacao} lançamento(s) com candidatas para vínculo.`,
      link: "/conciliacao",
      linkLabel: "Conciliar agora",
    });
  }

  if (kpis.saldoAberto > 0) {
    alerts.push({
      id: "saldo-aberto",
      type: "info",
      title: "Recebíveis em aberto",
      message: `Há saldo pendente de recebimento nas notas fiscais.`,
      link: "/relatorios/extracao",
      linkLabel: "Ver extração",
    });
  }

  const failed = recentImports.filter((item) => item.status === "failed");
  if (failed.length > 0) {
    alerts.push({
      id: "import-failed",
      type: "error",
      title: "Importação com falha",
      message: `${failed.length} importação(ões) recente(s) falharam.`,
      link: failed[0].link,
      linkLabel: "Ver detalhes",
    });
  }

  return alerts;
}

export const dashboardService = {
  async load(filters: DashboardFilters): Promise<DashboardData> {
    const [
      extracaoRes,
      pendentesAsaasRes,
      pendentesNubankRes,
      semMatchAsaasRes,
      semMatchNubankRes,
      importacoesRes,
      importacoesBancariasRes,
    ] = await Promise.all([
      api.get<ExtracaoResponse>("/notas/extracao", { params: paymentDateApiParams(filters) }),
      api.get<ConciliacaoListResponse>("/extrato-asaas/pendentes"),
      api.get<ConciliacaoListResponse>("/extrato-nubank/pendentes"),
      api.get<ConciliacaoListResponse>("/extrato-asaas/sem-match"),
      api.get<ConciliacaoListResponse>("/extrato-nubank/sem-match"),
      api.get<PaginatedResponse<ImportacaoFatura>>("/importacoes", { params: { page: 1, limit: 20 } }),
      api.get<PaginatedResponse<ImportacaoBancaria>>("/importacoes-bancarias", {
        params: { page: 1, limit: 20 },
      }),
    ]);

    const extracao = extracaoRes.data;
    const { pagas, emAberto } = countNotasByStatus(extracao.items);

    const pendentesAsaas = filterConciliacaoResponse(pendentesAsaasRes.data, filters);
    const pendentesNubank = filterConciliacaoResponse(pendentesNubankRes.data, filters);
    const semMatchAsaas = filterConciliacaoResponse(semMatchAsaasRes.data, filters);
    const semMatchNubank = filterConciliacaoResponse(semMatchNubankRes.data, filters);

    const pendentesTotal = pendentesAsaas.total + pendentesNubank.total;
    const semMatchTotal = semMatchAsaas.total + semMatchNubank.total;

    const kpis = {
      valorNf: extracao.totais.valor_nf,
      valorRecebido: extracao.totais.valor_pago,
      saldoAberto: extracao.totais.saldo_aberto,
      totalNotas: extracao.total,
      notasPagas: pagas,
      notasEmAberto: emAberto,
      pendentesConciliacao: pendentesTotal,
      semMatch: semMatchTotal,
    };

    const recentImports = filterRecentImports(
      mergeRecentImports(importacoesRes.data.items, importacoesBancariasRes.data.items),
      filters,
    ).slice(0, 8);

    const pendingMovements = mergePendingMovements(
      pendentesAsaas,
      pendentesNubank,
      semMatchAsaas,
      semMatchNubank,
    );

    return {
      kpis,
      competenciaChart: buildPaymentMonthChart(extracao.items),
      conciliacaoChart: {
        categories: ["Pendente vínculo", "Sem match", "Notas pagas", "Notas em aberto"],
        values: [pendentesTotal, semMatchTotal, pagas, emAberto],
      },
      recentImports,
      pendingMovements,
      alerts: buildAlerts(kpis, recentImports),
    };
  },
};
