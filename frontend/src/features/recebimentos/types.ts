export type MatchInfo = {
  nameScore: number;
  valueMatch: boolean;
  partialMatch?: boolean;
  saldoAberto?: number;
  daysDiff: number | null;
  dateClose: boolean;
  mesCompetencia?: string;
  competenciaOffset?: number | null;
  competenciaMatch?: boolean;
  totalScore: number;
};

export type NotaCandidata = {
  _id: string;
  numero?: string;
  tomador?: string;
  valor?: number;
  valor_pago?: number;
  mes_competencia?: string;
  data_emissao?: string;
  status_pagamento?: string;
  match?: MatchInfo;
};

export type TomadorSugerido = {
  id: string;
  nome: string;
  score: number;
};

export type LancamentoConciliacao = {
  _id: string;
  data?: string;
  pagador_nome?: string;
  valor?: number;
  descricao?: string;
};

export type BancoSource = "bank";

export type LancamentoConciliacaoItem = {
  source: BancoSource;
  lancamento: LancamentoConciliacao;
  candidatas: NotaCandidata[];
  tomador_sugerido?: TomadorSugerido;
};

export type ConciliacaoListResponse = {
  items: Omit<LancamentoConciliacaoItem, "source">[];
  total: number;
};

export type ConciliacaoCountsResponse = {
  pendentes: number;
  sem_match: number;
};
