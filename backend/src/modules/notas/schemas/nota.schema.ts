import { Schema } from 'mongoose';
import { PagamentoVinculoSchema } from './pagamento-vinculo.schema';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

export const NotaSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    empresa: { type: String, index: true },
    empresa_id: { type: Number, index: true },
    numero: { type: String, required: true, index: true },
    nota_api_id: { type: String, index: true },
    tomador: { type: String, index: true },
    tomador_documento: { type: String, index: true },
    tomador_email: { type: String },
    codigo_servico: { type: String, index: true },
    discriminacao: { type: String },
    valor: { type: Number },
    valor_liquido: { type: Number },
    valor_iss: { type: Number },
    aliquota_iss: { type: Number },
    data_emissao: { type: Date, index: true },
    data_competencia: { type: Date },
    mes_competencia: { type: String, index: true },
    status: { type: String, index: true },
    status_emissao: { type: String, index: true },
    empresa_nome: { type: String },
    empresa_cnpj: { type: String },
    fatura_extras: { type: Object },
    status_pagamento: { type: String, index: true, default: 'em_aberto' },
    valor_pago: { type: Number, default: 0 },
    asaas_lancamento_id: { type: Schema.Types.ObjectId, ref: 'AsaasLancamento' },
    asaas_lancamento_ids: [{ type: Schema.Types.ObjectId, ref: 'AsaasLancamento' }],
    nubank_lancamento_id: { type: Schema.Types.ObjectId, ref: 'NubankLancamento' },
    nubank_lancamento_ids: [{ type: Schema.Types.ObjectId, ref: 'NubankLancamento' }],
    data_pagamento: { type: Date },
    rps_id: { type: String, index: true },
    link_prefeitura: { type: String },
    prefeitura_ccm: { type: String, index: true },
    prefeitura_cod_nf: { type: String },
    prefeitura_cod_verificacao: { type: String },
    pagamentos: [PagamentoVinculoSchema],
    json_original: { type: Object },
    importacao_fatura_id: { type: Schema.Types.ObjectId, ref: 'Importacao', index: true },
  },
  { timestamps: true },
);

NotaSchema.plugin(tenantPlugin);
NotaSchema.index({ tenantId: 1, empresa: 1, numero: 1 });
NotaSchema.index({ tenantId: 1, nota_api_id: 1 }, { sparse: true });

