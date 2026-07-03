export type TomadorEndereco = {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
};

export type Tomador = {
  _id: string;
  nome: string;
  documento?: string;
  email?: string;
  endereco?: TomadorEndereco;
  codigo_servico_padrao?: string;
  discriminacao_padrao?: string;
  aliquota_iss_padrao?: number;
  aliases_pagamento: string[];
  origem: "manual" | "importacao_nf" | "sugestao";
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TomadorListResponse = {
  items: Tomador[];
  total: number;
  page: number;
  limit: number;
};

export type CreateTomadorPayload = {
  nome: string;
  documento?: string;
  email?: string;
  endereco?: TomadorEndereco;
  codigo_servico_padrao?: string;
  discriminacao_padrao?: string;
  aliquota_iss_padrao?: number;
  aliases_pagamento?: string[];
};

export type UpdateTomadorPayload = Partial<CreateTomadorPayload>;

export type TomadorMatch = {
  _id: string;
  nome: string;
  documento?: string;
  email?: string;
  score: number;
};

export type ResolverTomadorResponse = {
  pagador_nome: string;
  matches: TomadorMatch[];
};

export type ImportarTomadoresResponse = {
  ok: boolean;
  created: number;
  skipped: number;
  total_notas_analisadas: number;
  grupos_encontrados: number;
};
