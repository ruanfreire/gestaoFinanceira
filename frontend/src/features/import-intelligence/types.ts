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
  extra_columns?: string[];
};

export type ImportProfileMapping = {
  header_row: number;
  delimiter: "," | ";" | "\t";
  columns: ImportColumnMapping;
  date_format: "DD/MM/YYYY" | "YYYY-MM-DD" | "auto";
  decimal_format: "br" | "us";
  tipo_movimento_rule: { type: "sign" } | { type: "column"; column: string; entrada_values?: string[] };
  skip_row_patterns: string[];
};

export type ImportAnalysisResult = {
  file_kind: string;
  banco_label_suggested: string;
  mapping: ImportProfileMapping;
  field_confidence: Record<string, number>;
  overall_confidence: number;
  gaps: Array<{ field: string; severity: string; message: string }>;
  source: string;
  sample_normalized: Array<{
    transacao_id: string;
    data: string;
    valor: number;
    descricao: string;
    pagador_nome?: string;
    tipo_movimento: string;
    tipo_transacao?: string;
    saldo_pos?: number;
    documento_ref?: string;
    fatura_numero?: string;
  }>;
  total_rows_parsed: number;
  detected_headers?: string[];
  detected_json_kind?: "nota_fiscal" | "bank_transactions" | "unknown";
  sample_raw_rows?: string[][];
  file_metadata?: StatementFileMetadata;
  field_confidence?: Record<string, number>;
};

export type ImportValidationReport = {
  valid: boolean;
  rows_ok: number;
  rows_failed: number;
  errors: string[];
  warnings: string[];
  sample_normalized?: ImportAnalysisResult["sample_normalized"];
};

export type ImportPresetKey = "asaas" | "nubank";

export type ImportPreset = {
  key: ImportPresetKey;
  name: string;
  banco_label: string;
  description: string;
};

export type ImportProfile = {
  _id: string;
  name: string;
  banco_label: string;
  empresa_nome?: string;
  empresa_cnpj?: string;
  conta_corrente?: string;
  mapping: ImportProfileMapping;
  usage_count?: number;
  source?: string;
  system_key?: string;
  file_kind?: "csv" | "json" | "xlsx";
};

export type ImportResult = {
  ok: boolean;
  importacao_id: string;
  profile_id: string;
  conciliado_auto?: number;
  pendente_vinculo?: number;
  sem_match?: number;
  imported?: number;
  skipped?: number;
};
