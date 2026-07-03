export type DecimalFormat = 'br' | 'us';
export type DateFormat = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'auto';
export type FileKind = 'csv' | 'xlsx' | 'json' | 'unknown';

export type TipoMovimentoRule =
  | { type: 'sign' }
  | { type: 'column'; column: string; entrada_values?: string[] };

export type ImportColumnMapping = {
  data?: string | null;
  valor?: string | null;
  descricao?: string | null;
  pagador_nome?: string | null;
  transacao_id?: string | null;
  tipo_transacao?: string | null;
  saldo?: string | null;
  documento?: string | null;
};

export type StatementFileMetadata = {
  saldo_inicial?: number;
  saldo_final?: number;
  empresa_nome?: string;
  empresa_cnpj?: string;
  conta_corrente?: string;
  periodo?: string;
  banco_label?: string;
  extra_columns?: string[];
};

export type ImportProfileMapping = {
  header_row: number;
  delimiter: ',' | ';' | '\t';
  columns: ImportColumnMapping;
  date_format: DateFormat;
  decimal_format: DecimalFormat;
  tipo_movimento_rule: TipoMovimentoRule;
  skip_row_patterns: string[];
};

export type FieldConfidence = Partial<Record<keyof ImportColumnMapping | 'header_row', number>>;

export type NormalizedLancamentoRow = {
  transacao_id: string;
  data: Date;
  valor: number;
  descricao: string;
  pagador_nome?: string;
  tipo_movimento: 'entrada' | 'saida';
  tipo_transacao?: string;
  saldo_pos?: number;
  documento_ref?: string;
  fatura_numero?: string;
  json_original: Record<string, unknown>;
};

/** Amostra serializada para API (datas em ISO string, sem json_original). */
export type NormalizedLancamentoSample = {
  transacao_id: string;
  data: string;
  valor: number;
  descricao: string;
  pagador_nome?: string;
  tipo_movimento: 'entrada' | 'saida';
  tipo_transacao?: string;
  saldo_pos?: number;
  documento_ref?: string;
  fatura_numero?: string;
};

export type AnalysisGap = {
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
};

export type ImportAnalysisResult = {
  file_kind: FileKind;
  banco_label_suggested: string;
  mapping: ImportProfileMapping;
  field_confidence: FieldConfidence;
  overall_confidence: number;
  gaps: AnalysisGap[];
  source: 'heuristic' | 'gemini' | 'hybrid' | 'rag_template';
  /** IA foi chamada nesta análise (Groq/Gemini/Ollama). */
  ai_attempted?: boolean;
  /** IA alterou mapeamento ou metadados sugeridos. */
  ai_applied?: boolean;
  ai_provider?: string;
  prompt_version?: string;
  rag_document_ids?: string[];
  sample_normalized: NormalizedLancamentoSample[];
  total_rows_parsed: number;
  parse_errors: string[];
  detected_headers?: string[];
  detected_json_kind?: 'nota_fiscal' | 'bank_transactions' | 'unknown';
  /** Metadados extraídos do cabeçalho do arquivo (saldos, empresa, período). */
  file_metadata?: StatementFileMetadata;
  /** Primeiras linhas brutas do arquivo (células por coluna) para prévia visual */
  sample_raw_rows?: string[][];
};

export type ImportValidationReport = {
  valid: boolean;
  rows_ok: number;
  rows_failed: number;
  errors: string[];
  warnings: string[];
  sample_normalized?: Array<{
    transacao_id: string;
    data: string;
    valor: number;
    descricao: string;
    pagador_nome?: string;
    tipo_movimento: 'entrada' | 'saida';
    tipo_transacao?: string;
    saldo_pos?: number;
    documento_ref?: string;
    fatura_numero?: string;
  }>;
};
