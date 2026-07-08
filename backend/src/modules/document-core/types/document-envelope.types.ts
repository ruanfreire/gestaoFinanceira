export type DocType =
  | 'cte'
  | 'nfe'
  | 'unknown_xml'
  | 'unknown';

export type ValidationIssue = {
  code: string;
  field?: string;
  message: string;
  suggestion?: string;
};

export type Party = {
  cnpj?: string;
  cpf?: string;
  ie?: string;
  nome: string;
  municipio?: string;
  uf?: string;
};

export type DocumentLink = {
  rel: string;
  targetDocumentId: string;
  score?: number;
};

export type DocumentEnvelopePayload = {
  docType: DocType;
  layoutVersion?: string;

  source: {
    filename: string;
    mime: string;
    contentHash: string;
    ingestedAt: string;
  };

  fiscalKeys?: {
    chaveAcesso?: string;
    numero?: string;
    serie?: string;
    modelo?: string;
    tpCTe?: string;
  };

  parties?: {
    emitente?: Party;
    remetente?: Party;
    destinatario?: Party;
    tomador?: Party;
    expedidor?: Party;
    recebedor?: Party;
  };

  amounts?: {
    valorPrestacao?: number;
    valorReceber?: number;
    componentes?: Array<{ nome: string; valor: number }>;
    icms?: { cst?: string; vbc?: number; vicms?: number };
  };

  dates?: {
    emissao?: string;
    competencia?: string;
  };

  route?: {
    municipioInicio?: string;
    ufInicio?: string;
    municipioFim?: string;
    ufFim?: string;
  };

  linkedDocuments?: Array<{
    type: 'nfe' | 'outro';
    chaveAcesso?: string;
  }>;

  validation: {
    ok: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };

  confidence: number;
  rawXml?: string;
  links: DocumentLink[];
};

export type IngestItemResult = {
  id: string;
  docType: DocType;
  filename: string;
  fiscalKeys?: DocumentEnvelopePayload['fiscalKeys'];
  amounts?: Pick<NonNullable<DocumentEnvelopePayload['amounts']>, 'valorReceber'>;
  parties?: { tomador?: Party; emitente?: Party };
  validation: DocumentEnvelopePayload['validation'];
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
