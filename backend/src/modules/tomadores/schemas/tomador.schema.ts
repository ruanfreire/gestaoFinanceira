import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

const TomadorEnderecoSchema = new Schema(
  {
    logradouro: { type: String },
    numero: { type: String },
    bairro: { type: String },
    cidade: { type: String },
    uf: { type: String, maxlength: 2 },
    cep: { type: String },
  },
  { _id: false },
);

export const TomadorSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    nome: { type: String, required: true, index: true },
    documento: { type: String, index: true },
    email: { type: String },
    endereco: { type: TomadorEnderecoSchema, default: undefined },
    codigo_servico_padrao: { type: String },
    discriminacao_padrao: { type: String },
    aliquota_iss_padrao: { type: Number },
    aliases_pagamento: { type: [String], default: [] },
    origem: {
      type: String,
      enum: ['manual', 'importacao_nf', 'sugestao'],
      default: 'manual',
    },
    ativo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

TomadorSchema.plugin(tenantPlugin);
TomadorSchema.index({ tenantId: 1, documento: 1 }, { sparse: true });
TomadorSchema.index({ tenantId: 1, nome: 1 });
