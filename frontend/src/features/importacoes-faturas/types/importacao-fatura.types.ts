export type ImportacaoFaturaStats = {
  total_faturas?: number;
  imported?: number;
  updated?: number;
  ignored?: number;
};

export type ImportacaoFatura = {
  _id: string;
  filename?: string;
  originalName?: string;
  label?: string;
  descricao?: string;
  status?: string;
  stats?: ImportacaoFaturaStats;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt?: string;
  finishedAt?: string;
};

export type ImportacoesFaturasListResponse = {
  items: ImportacaoFatura[];
  total: number;
  page: number;
  limit: number;
};

export type ImportacaoUploadResult = {
  ok: boolean;
  id?: string;
  imported?: number;
  updated?: number;
  ignored?: number;
  processingTimeMs?: number;
  message?: string;
};

export type FaturaPreview = {
  nota_api_id?: string;
  numero?: string;
  tomador?: string;
  codigo_servico?: string;
  valor?: number;
  data_emissao?: string;
  mes_competencia?: string;
  status_emissao?: string;
  empresa_nome?: string;
};

export type FaturasListResponse = {
  items: FaturaPreview[];
  total: number;
  page: number;
  limit: number;
  importacao: ImportacaoFatura;
};

export type ReprocessResult = {
  imported?: number;
  updated?: number;
  ignored?: number;
  total_faturas?: number;
};

export type UpdateImportacaoMetadataPayload = {
  label?: string;
  descricao?: string;
};

export type JsonFilePreview = {
  valid: boolean;
  error?: string;
  totalFaturas: number;
  empresas: number;
  sample: FaturaPreview[];
};
