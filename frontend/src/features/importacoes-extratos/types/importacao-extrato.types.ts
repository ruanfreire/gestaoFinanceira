export type BancoExtrato = "asaas" | "nubank";

export type ImportacaoExtrato = {
  _id: string;
  banco: BancoExtrato;
  filename?: string;
  originalName?: string;
  label?: string;
  descricao?: string;
  periodo?: string;
  formato?: string;
  saldo_inicial?: number;
  saldo_final?: number;
  status?: string;
  stats?: Record<string, number>;
  createdAt?: string;
  finishedAt?: string;
  errorMessage?: string;
};

export type ImportacoesExtratosListResponse = {
  items: ImportacaoExtrato[];
  total: number;
  page: number;
  limit: number;
};

export type ExtratoUploadResult = {
  ok: boolean;
  importacao_id?: string;
  cobrancas?: number;
  creditos?: number;
  entradas?: number;
  saidas?: number;
  extrato?: number;
  conciliado_auto?: number;
  pendente_vinculo?: number;
  sem_match?: number;
  imported?: number;
  skipped?: number;
  total_linhas?: number;
  formato?: string;
};

export type NotaVinculadaResumo = {
  numero?: string;
  tomador?: string;
  mes_competencia?: string;
};

export type AsaasLancamento = {
  banco: "asaas";
  _id: string;
  transacao_id?: string;
  data?: string;
  tipo_transacao?: string;
  transacao_estornada?: boolean;
  descricao?: string;
  valor?: number;
  saldo?: number | null;
  fatura_parcelamento_id?: string;
  fatura_cobranca_id?: string;
  nota_fiscal_ref?: string;
  wallet?: string;
  tipo_lancamento?: string;
  tipo_movimento?: "entrada" | "saida";
  pagador_nome?: string;
  status_conciliacao?: string;
  nota?: NotaVinculadaResumo | null;
};

export type NubankLancamento = {
  banco: "nubank";
  _id: string;
  transacao_id?: string;
  data?: string;
  descricao?: string;
  valor?: number;
  categoria?: string;
  origem?: string;
  tipo?: string;
  tipo_movimento?: "entrada" | "saida";
  pagador_nome?: string;
  status_conciliacao?: string;
  nota?: NotaVinculadaResumo | null;
};

export type LancamentoExtrato = AsaasLancamento | NubankLancamento;

export type LancamentosExtratoResponse = {
  items: LancamentoExtrato[];
  total: number;
  linhas_arquivo?: number;
  page: number;
  limit: number;
  importacao: ImportacaoExtrato;
};

export type UpdateImportacaoExtratoMetadataPayload = {
  label?: string;
  descricao?: string;
};

export type CsvFilePreview = {
  valid: boolean;
  error?: string;
  lineCount: number;
  headers: string[];
  sampleRows: string[][];
};
