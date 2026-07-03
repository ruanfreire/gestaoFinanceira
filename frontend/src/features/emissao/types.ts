import type { Tomador } from "@/features/tomadores/types";

export type EmissaoRascunhoPayload = {
  valor?: number;
  codigo_servico?: string;
  discriminacao?: string;
  aliquota_iss?: number;
  data_competencia?: string;
};

export type EmissaoRascunho = {
  _id: string;
  lancamento_id: string;
  tomador_id?: string;
  tomador?: Tomador;
  payload: EmissaoRascunhoPayload;
  status: "rascunho" | "confirmado" | "emitindo" | "emitida" | "erro";
  nota_id?: string;
  erro_mensagem?: string;
};

export type CriarEmissaoRascunhoPayload = {
  lancamento_id: string;
  tomador_id?: string;
};

export type UpdateEmissaoRascunhoPayload = Partial<EmissaoRascunhoPayload> & {
  tomador_id?: string;
};

export type ConfirmarEmissaoResponse = {
  ok: boolean;
  rascunho_id: string;
  nota_id: string;
  numero: string;
  status_emissao: string;
  emissao_honest: boolean;
};

export type EmissaoCountsResponse = {
  aguardando_emissao: number;
};
