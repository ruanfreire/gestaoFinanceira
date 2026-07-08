import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

const PartySchema = new Schema(
  {
    cnpj: String,
    cpf: String,
    ie: String,
    nome: String,
    municipio: String,
    uf: String,
  },
  { _id: false },
);

const ValidationIssueSchema = new Schema(
  {
    code: String,
    field: String,
    message: String,
    suggestion: String,
  },
  { _id: false },
);

export const DocumentEnvelopeSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    batchId: { type: String, index: true },
    docType: { type: String, index: true, required: true },
    layoutVersion: String,
    source: {
      filename: String,
      mime: String,
      contentHash: { type: String, index: true },
      ingestedAt: String,
    },
    fiscalKeys: {
      chaveAcesso: { type: String, index: true },
      numero: String,
      serie: String,
      modelo: String,
      tpCTe: String,
    },
    parties: {
      emitente: PartySchema,
      remetente: PartySchema,
      destinatario: PartySchema,
      tomador: PartySchema,
      expedidor: PartySchema,
      recebedor: PartySchema,
    },
    amounts: {
      valorPrestacao: Number,
      valorReceber: Number,
      componentes: [{ nome: String, valor: Number }],
      icms: { cst: String, vbc: Number, vicms: Number },
    },
    dates: {
      emissao: String,
      competencia: { type: String, index: true },
    },
    route: {
      municipioInicio: String,
      ufInicio: String,
      municipioFim: String,
      ufFim: String,
    },
    linkedDocuments: [{ type: { type: String }, chaveAcesso: String }],
    validation: {
      ok: { type: Boolean, index: true },
      errors: [ValidationIssueSchema],
      warnings: [ValidationIssueSchema],
    },
    confidence: Number,
    rawXml: String,
    links: [{ rel: String, targetDocumentId: String, score: Number }],
  },
  { timestamps: true },
);

DocumentEnvelopeSchema.plugin(tenantPlugin);
DocumentEnvelopeSchema.index({ tenantId: 1, 'fiscalKeys.chaveAcesso': 1 });
DocumentEnvelopeSchema.index({ tenantId: 1, docType: 1, createdAt: -1 });
