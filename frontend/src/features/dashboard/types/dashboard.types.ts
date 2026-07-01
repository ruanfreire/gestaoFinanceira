export type NotaExtracaoItem = {
  _id: string;
  valor?: number;
  valor_pago?: number;
  valor_pago_efetivo?: number;
  saldo_aberto?: number;
  mes_competencia?: string;
  data_pagamento?: string;
  pagamentos?: Array<{ data?: string; valor?: number }>;
  status_pagamento?: string;
  tomador?: string;
};

export type ExtracaoResponse = {
  items: NotaExtracaoItem[];
  total: number;
  totais: {
    valor_nf: number;
    valor_pago: number;
    saldo_aberto: number;
  };
};

export type LancamentoConciliacao = {
  _id: string;
  data?: string;
  pagador_nome?: string;
  valor?: number;
  descricao?: string;
};

export type ConciliacaoItem = {
  lancamento: LancamentoConciliacao;
  candidatas: unknown[];
};

export type ConciliacaoListResponse = {
  items: ConciliacaoItem[];
  total: number;
};

export type ImportacaoFatura = {
  _id: string;
  filename?: string;
  originalName?: string;
  label?: string;
  status?: string;
  stats?: {
    total_faturas?: number;
    imported?: number;
  };
  createdAt?: string;
};

export type ImportacaoBancaria = {
  _id: string;
  banco: "asaas" | "nubank";
  filename?: string;
  originalName?: string;
  label?: string;
  status?: string;
  stats?: Record<string, number>;
  createdAt?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
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
  source: "asaas" | "nubank";
  pagador?: string;
  valor?: number;
  data?: string;
  candidatasCount: number;
  variant: "pendente" | "sem_match";
};

export type DashboardAlert = {
  id: string;
  type: "warning" | "info" | "error";
  title: string;
  message: string;
  link?: string;
  linkLabel?: string;
};

export type CompetenciaChart = {
  categories: string[];
  emitido: number[];
  recebido: number[];
};

export type DashboardFilterMode = "mes" | "periodo";

export type DashboardFilters = {
  filterMode: DashboardFilterMode;
  mesPagamento: string;
  from: string;
  to: string;
};

export type DashboardData = {
  kpis: {
    valorNf: number;
    valorRecebido: number;
    saldoAberto: number;
    totalNotas: number;
    notasPagas: number;
    notasEmAberto: number;
    pendentesConciliacao: number;
    semMatch: number;
  };
  competenciaChart: CompetenciaChart;
  conciliacaoChart: {
    categories: string[];
    values: number[];
  };
  recentImports: RecentImport[];
  pendingMovements: PendingMovement[];
  alerts: DashboardAlert[];
};
