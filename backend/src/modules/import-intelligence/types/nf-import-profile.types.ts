export type NfTraversalKeys = {
  data_array?: string;
  empresa_array?: string;
  lista_array?: string;
  items_array?: string;
};

/** Caminhos relativos ao item (suporta alternativas com |, ex.: tomador_nome|tomador) */
export type NfItemFieldMap = {
  numero?: string;
  nota_api_id?: string;
  tomador?: string;
  tomador_documento?: string;
  tomador_email?: string;
  codigo_servico?: string;
  discriminacao?: string;
  valor?: string;
  valor_liquido?: string;
  valor_iss?: string;
  aliquota_iss?: string;
  data_emissao?: string;
  data_competencia?: string;
  status_emissao?: string;
  rps_id?: string;
  link_prefeitura?: string;
};

export type NfEmpresaFieldMap = {
  id?: string;
  nome?: string;
  cnpj?: string;
  codigo?: string;
};

export type NfImportProfileMapping = {
  structure: 'honest_v1' | 'custom';
  traversal: NfTraversalKeys;
  item_fields: NfItemFieldMap;
  empresa_fields: NfEmpresaFieldMap;
  skip_status_patterns?: string[];
};

export type NfImportPreviewItem = {
  numero?: string;
  nota_api_id?: string;
  tomador?: string;
  valor?: number;
  data_emissao?: string;
  mes_competencia?: string;
  status_emissao?: string;
  empresa_nome?: string;
};

export type NfImportAnalysisResult = {
  profile_name_suggested: string;
  mapping: NfImportProfileMapping;
  field_confidence: Partial<Record<keyof NfItemFieldMap | keyof NfEmpresaFieldMap, number>>;
  overall_confidence: number;
  gaps: Array<{ field: string; severity: 'error' | 'warning' | 'info'; message: string }>;
  source: 'heuristic' | 'hybrid' | 'gemini';
  sample: NfImportPreviewItem[];
  total_notas: number;
  parse_errors: string[];
  ai_attempted?: boolean;
  ai_applied?: boolean;
  ai_provider?: string;
  prompt_version?: string;
};

export type NfImportValidationReport = {
  valid: boolean;
  rows_ok: number;
  rows_failed: number;
  errors: string[];
  warnings: string[];
  sample: NfImportPreviewItem[];
  inconsistencies: Array<{ type: string; message: string }>;
};

export const HONEST_V1_NF_MAPPING: NfImportProfileMapping = {
  structure: 'honest_v1',
  traversal: {
    data_array: 'data',
    empresa_array: 'empresa',
    lista_array: 'nf_lista',
    items_array: 'items',
  },
  item_fields: {},
  empresa_fields: {},
  skip_status_patterns: ['CANCEL'],
};
