export type FaturaPreview = {
  nota_api_id?: string;
  numero?: string;
  tomador?: string;
  codigo_servico?: string;
  valor?: number;
  data_emissao?: string;
  status_emissao?: string;
  empresa_nome?: string;
};

export type JsonFilePreview = {
  valid: boolean;
  error?: string;
  totalFaturas: number;
  empresas: number;
  sample: FaturaPreview[];
};

export type ImportacaoFatura = {
  _id: string;
  filename?: string;
  originalName?: string;
  label?: string;
  descricao?: string;
  status?: string;
  createdAt?: string;
  stats?: { total_faturas?: number; imported?: number; updated?: number; ignored?: number };
};

export type ImportacaoUploadResult = {
  ok: boolean;
  id: string;
  imported: number;
  updated: number;
  ignored: number;
  total_faturas: number;
  processingTimeMs?: number;
};

export type BancoExtrato = "asaas" | "nubank";

export type ImportacaoExtrato = ImportacaoFatura & {
  banco: BancoExtrato;
  stats?: {
    total_linhas?: number;
    imported?: number;
    conciliado_auto?: number;
    pendente_vinculo?: number;
    sem_match?: number;
    cobrancas?: number;
    creditos?: number;
    entradas?: number;
    saidas?: number;
  };
};

export type CsvFilePreview = {
  valid: boolean;
  error?: string;
  lineCount: number;
  headers: string[];
  sampleRows: string[][];
};

export type ExtratoUploadResult = ImportacaoUploadResult & {
  importacao_id: string;
  conciliado_auto?: number;
  pendente_vinculo?: number;
  sem_match?: number;
};
