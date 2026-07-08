export type PrefeituraEmitInput = {
  tomador_nome: string;
  tomador_documento: string;
  tomador_email?: string;
  valor: number;
  codigo_servico: string;
  discriminacao: string;
  aliquota_iss?: number;
  data_competencia?: string;
};

export type PrefeituraEmitResult = {
  ok: boolean;
  nota_api_id?: string;
  numero?: string;
  link_prefeitura?: string;
  status_emissao?: string;
  error?: string;
  raw?: unknown;
};

export type PrefeituraEmissaoContext = {
  tenantId: string;
  empresa_cnpj?: string;
  empresa_nome?: string;
};

export const PREFEITURA_CODIGOS = ['sp'] as const;
export type PrefeituraCodigo = (typeof PREFEITURA_CODIGOS)[number];

export const PREFEITURA_LABELS: Record<PrefeituraCodigo, string> = {
  sp: 'Prefeitura de São Paulo (NFS-e)',
};
