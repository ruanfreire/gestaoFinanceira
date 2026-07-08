import api from "@/lib/api-client";
import { ROUTES } from "@/lib/constants";
import { paymentDateApiParams } from "@/design-system/molecules";
import { formatCompetencia, formatDate } from "@/lib/format";
import { isDateInFilterPeriod, isToday } from "@/lib/period-utils";

export type DashboardFilters = import("@/design-system/molecules").PeriodFilterValue;
export type DashboardDateBasis = "pagamento" | "emissao";

export type NotaExtracaoItem = {
  _id: string;
  numero?: string;
  tomador?: string;
  valor?: number;
  valor_pago?: number;
  valor_pago_efetivo?: number;
  saldo_aberto?: number;
  status_pagamento?: string;
  data_emissao?: string;
  data_pagamento?: string;
  mes_competencia?: string;
  pagamentos?: { data?: string; valor?: number }[];
};

export type ExtracaoResponse = {
  items: NotaExtracaoItem[];
  total: number;
  totais: { valor_nf: number; valor_pago: number; saldo_aberto: number };
};

export type ConciliacaoListResponse = {
  items: { lancamento: { _id: string; data?: string; pagador_nome?: string; valor?: number }; candidatas: unknown[] }[];
  total: number;
};

export type ImportacaoFatura = {
  _id: string;
  label?: string;
  originalName?: string;
  filename?: string;
  status?: string;
  createdAt?: string;
  stats?: { imported?: number };
};

export type ImportacaoBancaria = ImportacaoFatura & {
  banco: "bank";
  banco_label?: string;
  stats?: { imported?: number; total_linhas?: number; cobrancas?: number; creditos?: number };
};

export type DashboardAlert = {
  id: string;
  type: "warning" | "info" | "error";
  title: string;
  message: string;
  link: string;
  linkLabel: string;
};

export type RecentImport = {
  id: string;
  kind: "fatura" | "extrato";
  title: string;
  subtitle: string;
  status?: string;
  createdAt?: string;
  link: string;
};

export type PendingMovement = {
  id: string;
  source: "bank";
  bancoLabel?: string;
  pagador?: string;
  valor?: number;
  data?: string;
  candidatasCount: number;
  variant: "pendente" | "sem_match";
};

export type TodaySummary = {
  notasImportadas: number;
  extratosImportados: number;
  importacoesComErro: number;
};

export type NotaStatusBreakdown = {
  emAberto: number;
  parcial: number;
  pago: number;
};

export type DashboardKpis = {
  valorNf: number;
  valorRecebido: number;
  saldoAberto: number;
  totalNotas: number;
  notasPagas: number;
  notasEmAberto: number;
  notasParciais: number;
  overdueNotas: number;
  pendentesConciliacao: number;
  semMatch: number;
  pagamentosAguardandoEmissao: number;
  importsInPeriod: number;
  percentRecebido: number;
};

export type DashboardData = {
  dateBasis: DashboardDateBasis;
  kpis: DashboardKpis;
  notaStatus: NotaStatusBreakdown;
  competenciaChart: { categories: string[]; emitido: number[]; recebido: number[] };
  recentImports: RecentImport[];
  pendingMovements: PendingMovement[];
  alerts: DashboardAlert[];
  todaySummary: TodaySummary;
};

function paymentMonthKey(value: string | Date): string {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function buildMonthChart(items: NotaExtracaoItem[], dateBasis: DashboardDateBasis) {
  const map = new Map<string, { emitido: number; recebido: number }>();
  for (const item of items) {
    if (dateBasis === "emissao") {
      const emissionDate = item.data_emissao ?? item.mes_competencia;
      if (!emissionDate) continue;
      const key = paymentMonthKey(emissionDate);
      const current = map.get(key) ?? { emitido: 0, recebido: 0 };
      current.emitido += Number(item.valor ?? 0);
      current.recebido += Number(item.valor_pago_efetivo ?? item.valor_pago ?? 0);
      map.set(key, current);
      continue;
    }
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
  const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  return {
    categories: sorted.map(([key]) => formatCompetencia(key)),
    emitido: sorted.map(([, v]) => v.emitido),
    recebido: sorted.map(([, v]) => v.recebido),
  };
}

async function loadExtracao(filters: DashboardFilters, dateBasis: DashboardDateBasis) {
  const res = await api.get<ExtracaoResponse>("/notas/extracao", {
    params: { ...paymentDateApiParams(filters), date_basis: dateBasis },
  });
  return res.data;
}

const INTERNAL_NAME = /^(?:[0-9a-f]{8}-[0-9a-f]{4}|[0-9a-f-]{24,})/i;

function friendlyImportTitle(
  candidates: Array<string | undefined>,
  fallback: string,
): string {
  for (const raw of candidates) {
    const name = raw?.trim();
    if (!name || INTERNAL_NAME.test(name)) continue;
    if (name.length > 52) return `${name.slice(0, 49)}…`;
    return name;
  }
  return fallback;
}

function mergeRecentImports(faturas: ImportacaoFatura[], extratos: ImportacaoBancaria[]): RecentImport[] {
  const faturaItems: RecentImport[] = faturas.map((item) => ({
    id: item._id,
    kind: "fatura",
    title: friendlyImportTitle(
      [item.label, item.originalName, item.filename],
      item.createdAt ? `Notas · ${formatDate(item.createdAt)}` : "Lote de notas",
    ),
    subtitle: `${item.stats?.imported ?? 0} nota(s) importada(s)`,
    status: item.status,
    createdAt: item.createdAt,
    link: `${ROUTES.financeiroHistorico}/notas/${item._id}`,
  }));
  const extratoItems: RecentImport[] = extratos.map((item) => {
    const bancoNome = item.banco_label?.trim() || "Banco";
    const movimentos = item.stats?.imported ?? item.stats?.total_linhas ?? item.stats?.cobrancas ?? item.stats?.creditos ?? 0;
    return {
      id: `bank-${item._id}`,
      kind: "extrato",
      title: friendlyImportTitle(
        [item.label, item.originalName, item.filename],
        item.createdAt ? `Extrato ${bancoNome} · ${formatDate(item.createdAt)}` : `Extrato ${bancoNome}`,
      ),
      subtitle: `${movimentos} movimento(s) · ${bancoNome}`,
      status: item.status,
      createdAt: item.createdAt,
      link: `${ROUTES.financeiroHistorico}/extratos/bank/${item._id}`,
    };
  });
  return [...faturaItems, ...extratoItems]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 8);
}

function buildAlerts(kpis: DashboardKpis, recentImports: RecentImport[]): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  if (kpis.overdueNotas > 0) {
    alerts.push({
      id: "overdue-notas",
      type: "warning",
      title: "Notas em aberto há mais de 30 dias",
      message: `${kpis.overdueNotas} nota(s) aguardam recebimento há mais de um mês.`,
      link: ROUTES.relatoriosSituacao,
      linkLabel: "Ver situação",
    });
  }
  if (kpis.semMatch > 0) {
    alerts.push({
      id: "sem-match",
      type: "warning",
      title: "Pagamentos sem nota",
      message: `${kpis.semMatch} movimento(s) precisam da sua análise.`,
      link: ROUTES.financeiroConfirmarSem,
      linkLabel: "Ver agora",
    });
  }
  if (kpis.pagamentosAguardandoEmissao > 0) {
    alerts.push({
      id: "aguardando-emissao",
      type: "info",
      title: "Pagamentos aguardam emissão de NF",
      message: `${kpis.pagamentosAguardandoEmissao} recebimento(s) podem gerar nota fiscal.`,
      link: ROUTES.financeiroConfirmarSem,
      linkLabel: "Emitir ou registrar",
    });
  }
  if (kpis.pendentesConciliacao > 0) {
    alerts.push({
      id: "pendentes",
      type: "info",
      title: "Pagamentos aguardando confirmação",
      message: `${kpis.pendentesConciliacao} movimento(s) com sugestões para você confirmar.`,
      link: ROUTES.financeiroConfirmar,
      linkLabel: "Confirmar recebimentos",
    });
  }
  if (kpis.saldoAberto > 0) {
    alerts.push({
      id: "saldo-aberto",
      type: "info",
      title: "Valores em aberto",
      message: "Há notas com recebimento pendente no período.",
      link: ROUTES.relatoriosSituacao,
      linkLabel: "Ver situação",
    });
  }
  const failed = recentImports.filter((i) => i.status === "failed");
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

export const homeApi = {
  async load(filters: DashboardFilters): Promise<DashboardData> {
    let dateBasis: DashboardDateBasis = "pagamento";
    let extracao = await loadExtracao(filters, "pagamento");
    if (extracao.total === 0) {
      const byEmission = await loadExtracao(filters, "emissao");
      if (byEmission.total > 0) {
        extracao = byEmission;
        dateBasis = "emissao";
      }
    }

    const [pendentesRes, semMatchRes, emissaoCountsRes, importacoes, extratos] = await Promise.all([
      api.get<ConciliacaoListResponse>("/import-intelligence/pendentes"),
      api.get<ConciliacaoListResponse>("/import-intelligence/sem-match"),
      api.get<{ aguardando_emissao: number }>("/emissao/counts"),
      api.get<{ items: ImportacaoFatura[] }>("/importacoes", { params: { page: 1, limit: 20 } }),
      api.get<{ items: ImportacaoBancaria[] }>("/importacoes-bancarias", { params: { page: 1, limit: 20 } }),
    ]);

    const filterConc = (res: ConciliacaoListResponse) => ({
      items: res.items.filter((i) => isDateInFilterPeriod(i.lancamento.data, filters)),
      total: 0,
    });
    const pa = filterConc(pendentesRes.data);
    const sn = filterConc(semMatchRes.data);
    pa.total = pa.items.length;
    sn.total = sn.items.length;

    let pagas = 0;
    let emAberto = 0;
    let parciais = 0;
    let overdue = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const item of extracao.items) {
      const saldo = Number(item.saldo_aberto ?? 0);
      const pago = Number(item.valor_pago_efetivo ?? item.valor_pago ?? 0);
      const status = item.status_pagamento;

      if (status === "parcial" || (saldo > 0 && pago > 0)) parciais++;
      else if (status === "pago" || saldo <= 0) pagas++;
      else emAberto++;

      if (saldo > 0 && item.data_emissao) {
        const emission = new Date(item.data_emissao);
        if (!Number.isNaN(emission.getTime()) && emission < thirtyDaysAgo) overdue++;
      }
    }

    const pendentesTotal = pa.total;
    const semMatchTotal = sn.total;
    const valorNf = extracao.totais.valor_nf;
    const valorRecebido = extracao.totais.valor_pago;

    const importsInPeriod =
      importacoes.data.items.filter((i) => isDateInFilterPeriod(i.createdAt, filters)).length +
      extratos.data.items.filter((i) => isDateInFilterPeriod(i.createdAt, filters)).length;

    const kpis: DashboardKpis = {
      valorNf,
      valorRecebido,
      saldoAberto: extracao.totais.saldo_aberto,
      totalNotas: extracao.total,
      notasPagas: pagas,
      notasEmAberto: emAberto,
      notasParciais: parciais,
      overdueNotas: overdue,
      pendentesConciliacao: pendentesTotal,
      semMatch: semMatchTotal,
      pagamentosAguardandoEmissao: emissaoCountsRes.data.aguardando_emissao ?? 0,
      importsInPeriod,
      percentRecebido: valorNf > 0 ? (valorRecebido / valorNf) * 100 : 0,
    };

    const recentImports = mergeRecentImports(importacoes.data.items, extratos.data.items);

    const todaySummary: TodaySummary = {
      notasImportadas: importacoes.data.items.filter((i) => isToday(i.createdAt)).length,
      extratosImportados: extratos.data.items.filter((i) => isToday(i.createdAt)).length,
      importacoesComErro: recentImports.filter((i) => i.status === "failed" && isToday(i.createdAt)).length,
    };

    const pendingMovements = [
      ...pa.items.map((item) => ({
        id: `bank-pendente-${item.lancamento._id}`,
        source: "bank" as const,
        bancoLabel: item.lancamento.pagador_nome,
        pagador: item.lancamento.pagador_nome,
        valor: item.lancamento.valor,
        data: item.lancamento.data,
        candidatasCount: item.candidatas.length,
        variant: "pendente" as const,
      })),
      ...sn.items.map((item) => ({
        id: `bank-sem-${item.lancamento._id}`,
        source: "bank" as const,
        pagador: item.lancamento.pagador_nome,
        valor: item.lancamento.valor,
        data: item.lancamento.data,
        candidatasCount: 0,
        variant: "sem_match" as const,
      })),
    ]
      .sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime())
      .slice(0, 6);

    return {
      dateBasis,
      kpis,
      notaStatus: { emAberto, parcial: parciais, pago: pagas },
      competenciaChart: buildMonthChart(extracao.items, dateBasis),
      recentImports,
      pendingMovements,
      alerts: buildAlerts(kpis, recentImports),
      todaySummary,
    };
  },
};
