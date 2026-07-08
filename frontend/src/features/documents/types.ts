export type ValidationIssue = {
  code: string;
  field?: string;
  message: string;
  suggestion?: string;
};

export type DocumentParty = {
  cnpj?: string;
  cpf?: string;
  nome: string;
};

export type IngestItemResult = {
  id: string;
  docType: string;
  filename: string;
  fiscalKeys?: {
    chaveAcesso?: string;
    numero?: string;
    serie?: string;
  };
  amounts?: { valorReceber?: number };
  parties?: { tomador?: DocumentParty; emitente?: DocumentParty };
  validation: {
    ok: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };
  freteTituloId?: string;
};

export type IngestBatchResult = {
  batch_id: string;
  summary: {
    total: number;
    cte_ok: number;
    cte_warning: number;
    failed: number;
    skipped: number;
  };
  items: IngestItemResult[];
};

export type DocumentListItem = {
  _id: string;
  docType: string;
  source?: { filename?: string; ingestedAt?: string };
  fiscalKeys?: { chaveAcesso?: string; numero?: string };
  amounts?: { valorReceber?: number };
  parties?: { tomador?: DocumentParty; emitente?: DocumentParty };
  dates?: { emissao?: string };
  validation?: { ok: boolean; errors?: ValidationIssue[]; warnings?: ValidationIssue[] };
  linkedDocuments?: Array<{ type: string; chaveAcesso?: string }>;
  links?: Array<{ rel: string; targetDocumentId: string }>;
  createdAt: string;
};

export type DocumentDetail = DocumentListItem & {
  confidence?: number;
};

export type FreteTitulo = {
  _id: string;
  chave_cte: string;
  numero?: string;
  tomador_nome?: string;
  tomador_documento?: string;
  emitente_nome?: string;
  valor?: number;
  data_emissao?: string;
  status_pagamento: string;
  linked_nfe_chaves?: string[];
  createdAt: string;
};

export type FreteMatchInfo = {
  nameScore: number;
  valueMatch: boolean;
  daysDiff: number | null;
  dateClose: boolean;
  totalScore: number;
};

export type FreteTituloCandidata = FreteTitulo & {
  match?: FreteMatchInfo;
};

export type FreteLancamentoItem = {
  _id: string;
  data?: string;
  pagador_nome?: string;
  valor?: number;
  descricao?: string;
};

export type FreteConciliacaoItem = {
  lancamento: FreteLancamentoItem;
  candidatas: FreteTituloCandidata[];
};

export type FreteConciliacaoListResponse = {
  items: FreteConciliacaoItem[];
  total: number;
};
