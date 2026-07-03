export type NfTraversalKeys = {
  data_array?: string;
  empresa_array?: string;
  lista_array?: string;
  items_array?: string;
};

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
  structure: "honest_v1" | "custom";
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

export type NfImportProfile = {
  _id: string;
  name: string;
  description?: string;
  mapping: NfImportProfileMapping;
  system_key?: string;
  source?: string;
  usage_count?: number;
};

export type NfImportAnalysisResult = {
  profile_name_suggested: string;
  mapping: NfImportProfileMapping;
  overall_confidence: number;
  gaps: Array<{ field: string; severity: string; message: string }>;
  source: string;
  sample: NfImportPreviewItem[];
  total_notas: number;
  parse_errors: string[];
  ai_attempted?: boolean;
  ai_applied?: boolean;
  ai_provider?: string;
};

export type NfImportValidationReport = {
  valid: boolean;
  rows_ok: number;
  inconsistencies: Array<{ type: string; message: string }>;
  sample: NfImportPreviewItem[];
  errors: string[];
};

export type NfImportResult = {
  ok: boolean;
  id: string;
  imported: number;
  updated: number;
  ignored: number;
  total_faturas: number;
  processingTimeMs?: number;
  profile_id?: string;
};
