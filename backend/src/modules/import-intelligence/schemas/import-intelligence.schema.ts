import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

const mappingSchema = new Schema(
  {
    header_row: { type: Number, default: 1 },
    delimiter: { type: String, enum: [',', ';', '\t'], default: ';' },
    columns: {
      data: { type: String },
      valor: { type: String },
      descricao: { type: String },
      pagador_nome: { type: String },
      transacao_id: { type: String },
      tipo_transacao: { type: String },
      saldo: { type: String },
      documento: { type: String },
    },
    date_format: { type: String, enum: ['DD/MM/YYYY', 'YYYY-MM-DD', 'auto'], default: 'auto' },
    decimal_format: { type: String, enum: ['br', 'us'], default: 'br' },
    tipo_movimento_rule: { type: Schema.Types.Mixed, default: { type: 'sign' } },
    skip_row_patterns: { type: [String], default: [] },
  },
  { _id: false },
);

export const ImportProfileSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    name: { type: String, required: true },
    banco_label: { type: String, required: true },
    empresa_nome: { type: String },
    empresa_cnpj: { type: String },
    conta_corrente: { type: String },
    file_kind: { type: String, enum: ['csv', 'xlsx', 'json'], default: 'csv' },
    source: { type: String, enum: ['user', 'system_template'], default: 'user' },
    system_key: { type: String, index: true },
    mapping: { type: mappingSchema, required: true },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active', index: true },
    confidence_score: { type: Number, default: 0 },
    confirmed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    confirmed_at: { type: Date },
    usage_count: { type: Number, default: 0 },
    last_used_at: { type: Date },
    quality_score: { type: Number, default: 1 },
  },
  { timestamps: true },
);

ImportProfileSchema.plugin(tenantPlugin);
ImportProfileSchema.index({ tenantId: 1, name: 1 });
ImportProfileSchema.index({ tenantId: 1, system_key: 1 }, { sparse: true });

export const ImportAnalysisSessionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    file_hash: { type: String, index: true },
    file_name: { type: String },
    file_kind: { type: String },
    heuristic_result: { type: Schema.Types.Mixed },
    gemini_result: { type: Schema.Types.Mixed },
    rag_context_ids: [{ type: Schema.Types.ObjectId, ref: 'RagDocument' }],
    validation_report: { type: Schema.Types.Mixed },
    user_adjustments: { type: Schema.Types.Mixed },
    outcome: { type: String, enum: ['confirmed', 'rejected', 'imported'], default: 'confirmed' },
    prompt_version: { type: String },
    metrics: {
      preview_rows: { type: Number },
      imported_rows: { type: Number },
      preview_vs_import_match: { type: Boolean },
      suggestion_accepted_without_edit: { type: Boolean },
      overall_confidence: { type: Number },
    },
  },
  { timestamps: true },
);

ImportAnalysisSessionSchema.plugin(tenantPlugin);

export const RagDocumentSchema = new Schema(
  {
    scope: { type: String, enum: ['tenant', 'global_template'], default: 'tenant', index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    doc_type: {
      type: String,
      enum: ['import_profile', 'correction', 'bank_signature'],
      default: 'bank_signature',
      index: true,
    },
    signature_text: { type: String },
    embedding: { type: [Number], default: [] },
    payload: { type: Schema.Types.Mixed },
    quality_score: { type: Number, default: 1 },
    use_count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

RagDocumentSchema.plugin(tenantPlugin, { optional: true });

export const BankImportacaoSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    profile_id: { type: Schema.Types.ObjectId, ref: 'ImportProfile', index: true },
    banco_label: { type: String },
    filename: { type: String, required: true },
    originalName: { type: String },
    label: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    periodo: { type: String },
    origem: { type: String, enum: ['conta', 'cartao'], default: 'conta' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'finished', 'failed'],
      default: 'finished',
      index: true,
    },
    contentHash: { type: String, index: true },
    originalCsv: { type: String, select: false },
    transacao_ids: { type: [String], default: [] },
    stats: {
      total_linhas: { type: Number, default: 0 },
      entradas: { type: Number, default: 0 },
      saidas: { type: Number, default: 0 },
      conciliado_auto: { type: Number, default: 0 },
      pendente_vinculo: { type: Number, default: 0 },
      conciliado_manual: { type: Number, default: 0 },
      sem_match: { type: Number, default: 0 },
      extrato: { type: Number, default: 0 },
      imported: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
    saldo_inicial: { type: Number },
    saldo_final: { type: Number },
  },
  { timestamps: true },
);

BankImportacaoSchema.index({ tenantId: 1, contentHash: 1 }, { unique: true, sparse: true });
BankImportacaoSchema.plugin(tenantPlugin);

export const BankLancamentoSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    profile_id: { type: Schema.Types.ObjectId, ref: 'ImportProfile', index: true },
    importacao_id: { type: Schema.Types.ObjectId, ref: 'BankImportacao', index: true },
    transacao_id: { type: String, required: true, index: true },
    data: { type: Date, index: true },
    descricao: { type: String },
    valor: { type: Number },
    pagador_nome: { type: String, index: true },
    pagador_nome_normalizado: { type: String, index: true },
    tipo_movimento: { type: String, enum: ['entrada', 'saida'], index: true },
    origem: { type: String, enum: ['conta', 'cartao'], default: 'conta', index: true },
    status_conciliacao: {
      type: String,
      enum: ['extrato', 'conciliado_auto', 'pendente_vinculo', 'conciliado_manual', 'sem_match'],
      default: 'extrato',
      index: true,
    },
    nota_id: { type: Schema.Types.ObjectId, ref: 'Nota', index: true },
    candidatas_nota_ids: [{ type: Schema.Types.ObjectId, ref: 'Nota' }],
    tipo_transacao: { type: String },
    saldo_pos: { type: Number },
    documento_ref: { type: String },
    fatura_numero: { type: String, index: true },
    json_original: { type: Object },
  },
  { timestamps: true },
);

BankLancamentoSchema.plugin(tenantPlugin);
BankLancamentoSchema.index({ tenantId: 1, transacao_id: 1 }, { unique: true });
